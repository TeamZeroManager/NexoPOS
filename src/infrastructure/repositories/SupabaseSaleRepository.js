import { SaleRepository } from '../../domain/repositories/SaleRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

/**
 * SupabaseSaleRepository
 * ---------------------------------------------------------
 * Cumple el mismo contrato que LocalStorageSaleRepository (findAll,
 * findById, findByCustomer, save, updateStatus) PARA LECTURA.
 *
 * Para ESCRITURA de ventas, expone además dos métodos que
 * LocalStorage no tiene: completeSaleTransactional() y
 * registerCreditSaleTransactional(). saleUseCases.js los detecta y
 * los prefiere cuando existen — así la venta completa (venta +
 * detalle + inventario + caja) ocurre en UNA sola transacción real
 * de PostgreSQL (función registrar_venta / registrar_venta_fiada),
 * en vez de la simulación paso a paso que usa localStorage.
 */
export class SupabaseSaleRepository extends SaleRepository {
  toDomain(row) {
    if (!row) return null;
    return {
      id: row.id,
      customerId: row.cliente_id,
      paymentMethod: row.metodo_pago,
      subtotal: row.subtotal,
      discount: row.descuento,
      total: row.total,
      received: row.recibido,
      change: row.cambio,
      status: row.estado,
      createdAt: row.created_at,
      items: (row.detalle_ventas ?? []).map((d) => ({
        productId: d.producto_id,
        name: d.nombre,
        price: d.precio,
        quantity: d.cantidad,
        discount: d.descuento,
      })),
    };
  }

  async findAll() {
    const { data, error } = await supabase
      .from('ventas')
      .select('*, detalle_ventas(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async findById(id) {
    const { data, error } = await supabase.from('ventas').select('*, detalle_ventas(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async findByCustomer(customerId) {
    const { data, error } = await supabase
      .from('ventas')
      .select('*, detalle_ventas(*)')
      .eq('cliente_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  /** Cumple la interfaz por compatibilidad; el flujo real usa las transactional() de abajo. */
  async save(sale) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('ventas')
      .insert({
        id: sale.id,
        empresa_id: empresaId,
        cliente_id: sale.customerId,
        metodo_pago: sale.paymentMethod,
        subtotal: sale.subtotal,
        descuento: sale.discount,
        total: sale.total,
        recibido: sale.received,
        cambio: sale.change,
        estado: sale.status,
      })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }

  async updateStatus(id, status) {
    const { data, error } = await supabase.from('ventas').update({ estado: status }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  /** Venta en efectivo/tarjeta/transferencia — transacción atómica real (sección 16). */
  async completeSaleTransactional({ items, paymentMethod, customerId, received }) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase.rpc('registrar_venta', {
      p_empresa_id: empresaId,
      p_cliente_id: customerId ?? null,
      p_metodo_pago: paymentMethod,
      p_items: items.map((i) => ({ producto_id: i.productId, cantidad: i.quantity, descuento: i.discount ?? 0 })),
      p_recibido: received ?? 0,
    });
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      customerId: data.cliente_id,
      paymentMethod: data.metodo_pago,
      subtotal: data.subtotal,
      discount: data.descuento,
      total: data.total,
      received: data.recibido,
      change: data.cambio,
      status: data.estado,
      createdAt: data.created_at,
      items,
    };
  }

  /** Venta fiada — transacción atómica real (sección 24). */
  async registerCreditSaleTransactional({ items, customerId }) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase.rpc('registrar_venta_fiada', {
      p_empresa_id: empresaId,
      p_cliente_id: customerId,
      p_items: items.map((i) => ({ producto_id: i.productId, cantidad: i.quantity, descuento: i.discount ?? 0 })),
    });
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      customerId: data.cliente_id,
      paymentMethod: data.metodo_pago,
      subtotal: data.subtotal,
      discount: data.descuento,
      total: data.total,
      received: data.recibido,
      change: data.cambio,
      status: data.estado,
      createdAt: data.created_at,
      items,
    };
  }
}
