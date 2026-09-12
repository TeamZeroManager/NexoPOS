import { BranchRepository } from '../../domain/repositories/BranchRepository.js';
import { supabase } from '../supabaseClient.js';

export class SupabaseBranchRepository extends BranchRepository {
  toDomain(row) {
    if (!row) return null;
    return { id: row.id, name: row.nombre, businessId: row.empresa_id, cashPointName: row.cash_point_name, createdAt: row.created_at };
  }

  async findAll() {
    const { data, error } = await supabase.from('sucursales').select('*').order('created_at');
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  /** No se usa directamente: la creación ocurre dentro de setup_business() (RPC atómica). */
  async save(branch) {
    const { data, error } = await supabase
      .from('sucursales')
      .insert({ id: branch.id, empresa_id: branch.businessId, nombre: branch.name, cash_point_name: branch.cashPointName })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }
}
