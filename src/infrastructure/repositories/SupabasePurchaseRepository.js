import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

/** Órdenes de compra. Crear/recibir/cancelar son RPC atómicas (stock + inventario + caja en una transacción). */
export class SupabasePurchaseRepository {
  toDomain(r) {
    return {
      id: r.id, supplierId: r.proveedor_id, supplierName: r.proveedores?.nombre ?? '—', status: r.estado,
      total: r.total, notes: r.notas, createdAt: r.created_at, receivedAt: r.recibida_en,
      items: (r.detalle_compras ?? []).map((d) => ({ productId: d.producto_id, name: d.nombre, quantity: d.cantidad, unitCost: d.costo_unitario })),
    };
  }
  async findAll() {
    const { data, error } = await supabase.from('ordenes_compra').select('*, proveedores(nombre), detalle_compras(*)').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }
  async create({ supplierId, items, notes }) {
    const { error } = await supabase.rpc('crear_orden_compra', {
      p_empresa_id: await getEmpresaId(), p_proveedor_id: supplierId, p_notas: notes ?? null,
      p_items: items.map((i) => ({ producto_id: i.productId, cantidad: i.quantity, costo_unitario: i.unitCost })),
    });
    if (error) throw new Error(error.message);
  }
  async receive(orderId, { payFromCash }) {
    const { error } = await supabase.rpc('recibir_orden_compra', { p_empresa_id: await getEmpresaId(), p_orden_id: orderId, p_pagar_de_caja: payFromCash });
    if (error) throw new Error(error.message);
  }
  async cancel(orderId) {
    const { error } = await supabase.rpc('cancelar_orden_compra', { p_empresa_id: await getEmpresaId(), p_orden_id: orderId });
    if (error) throw new Error(error.message);
  }
}
