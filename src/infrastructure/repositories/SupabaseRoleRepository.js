import { RoleRepository } from '../../domain/repositories/RoleRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

export class SupabaseRoleRepository extends RoleRepository {
  toDomain(row) {
    if (!row) return null;
    return { id: row.id, name: row.nombre, permissions: row.permisos, createdAt: row.created_at };
  }

  async findAll() {
    const { data, error } = await supabase.from('roles').select('*').order('created_at');
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async findById(id) {
    const { data, error } = await supabase.from('roles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  /** No se usa durante el setup inicial (eso pasa por setup_business RPC); sí para roles nuevos después. */
  async save(role) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('roles')
      .insert({ id: role.id, empresa_id: empresaId, nombre: role.name, permisos: role.permissions })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }
}
