import { CategoryRepository } from '../../domain/repositories/CategoryRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

export class SupabaseCategoryRepository extends CategoryRepository {
  toDomain(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.nombre,
      active: row.activo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findAll() {
    const { data, error } = await supabase.from('categorias').select('*').order('nombre');
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async findById(id) {
    const { data, error } = await supabase.from('categorias').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async save(category) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('categorias')
      .insert({ id: category.id, empresa_id: empresaId, nombre: category.name, activo: category.active })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }

  async update(id, changes) {
    const patch = { updated_at: new Date().toISOString() };
    if ('name' in changes) patch.nombre = changes.name;
    if ('active' in changes) patch.activo = changes.active;
    const { data, error } = await supabase.from('categorias').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async delete(id) {
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) throw error;
  }
}
