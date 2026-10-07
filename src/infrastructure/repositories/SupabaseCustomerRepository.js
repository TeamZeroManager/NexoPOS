import { CustomerRepository } from '../../domain/repositories/CustomerRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

export class SupabaseCustomerRepository extends CustomerRepository {
  toDomain(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.nombre,
      phone: row.telefono,
      email: row.email,
      creditLimit: row.cupo_credito,
      currentDebt: row.deuda_actual,
      active: row.activo,
      createdAt: row.created_at,
    };
  }

  async findAll() {
    const { data, error } = await supabase.from('clientes').select('*').order('nombre');
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async findById(id) {
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async save(customer) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        id: customer.id,
        empresa_id: empresaId,
        nombre: customer.name,
        telefono: customer.phone,
        email: customer.email,
        cupo_credito: customer.creditLimit,
        activo: customer.active,
      })
      .select()
      .single();
    if (error) throw this.friendly(error, customer.creditLimit > 0);
    return this.toDomain(data);
  }

  /** 42501 = la política RLS rechazó la escritura (falta permiso). */
  friendly(error, withCredit = false) {
    if (error?.code !== '42501') return error;
    return new Error(withCredit
      ? 'Solo un administrador puede asignar un cupo de crédito. Crea el cliente sin cupo y pide que se lo asignen.'
      : 'No tienes permiso para realizar esta acción');
  }

  /**
   * Los datos de contacto se actualizan directo (RLS + columnas permitidas). El cupo de crédito y
   * la deuda NO: el cupo pasa por una RPC que exige MANAGE_SETTINGS y la deuda solo la mueven
   * las ventas fiadas y los abonos.
   */
  async update(id, changes) {
    const patch = {};
    if ('name' in changes) patch.nombre = changes.name;
    if ('phone' in changes) patch.telefono = changes.phone;
    if ('email' in changes) patch.email = changes.email;
    if ('active' in changes) patch.activo = changes.active;

    let row = null;
    if (Object.keys(patch).length > 0) {
      const { data, error } = await supabase.from('clientes').update(patch).eq('id', id).select().maybeSingle();
      if (error) throw this.friendly(error);
      row = data;
    }
    if ('creditLimit' in changes) {
      const { data, error } = await supabase.rpc('actualizar_cupo_credito', {
        p_empresa_id: await getEmpresaId(), p_cliente_id: id, p_cupo: changes.creditLimit,
      });
      if (error) throw new Error(error.message);
      row = data;
    }
    if (!row) {
      const { data, error } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      row = data;
    }
    return this.toDomain(row);
  }

  /** Abono atómico (actualiza deuda + registra el ingreso en caja) — sección 24. */
  async registerPaymentTransactional(customerId, amount) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase.rpc('registrar_abono', {
      p_empresa_id: empresaId,
      p_cliente_id: customerId,
      p_monto: amount,
    });
    if (error) throw new Error(error.message);
    return this.toDomain(data);
  }
}
