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
        deuda_actual: customer.currentDebt,
        activo: customer.active,
      })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }

  async update(id, changes) {
    const patch = {};
    if ('name' in changes) patch.nombre = changes.name;
    if ('phone' in changes) patch.telefono = changes.phone;
    if ('email' in changes) patch.email = changes.email;
    if ('creditLimit' in changes) patch.cupo_credito = changes.creditLimit;
    if ('currentDebt' in changes) patch.deuda_actual = changes.currentDebt;
    if ('active' in changes) patch.activo = changes.active;
    const { data, error } = await supabase.from('clientes').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
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
