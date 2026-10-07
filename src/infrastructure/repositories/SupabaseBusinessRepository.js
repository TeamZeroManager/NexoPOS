import { BusinessRepository } from '../../domain/repositories/BusinessRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

/**
 * SupabaseBusinessRepository
 * ---------------------------------------------------------
 * A diferencia de LocalStorage (donde solo existe UN negocio por
 * navegador), aquí pueden existir muchas empresas en la misma base
 * de datos (multi-tenant real) — getCurrent() siempre devuelve SOLO
 * la del usuario autenticado (RLS + getEmpresaId lo garantizan).
 */
export class SupabaseBusinessRepository extends BusinessRepository {
  toDomain(row) {
    if (!row) return null;
    return {
      id: row.id, name: row.nombre, nit: row.nit, createdAt: row.created_at,
      address: row.direccion ?? null, phone: row.telefono ?? null, email: row.email ?? null,
      logoUrl: row.logo_url ?? null, primaryColor: row.color_primario ?? null,
      secondaryColor: row.color_secundario ?? null, receiptFooter: row.pie_recibo ?? null,
    };
  }

  async getCurrent() {
    const empresaId = await getEmpresaId();
    if (!empresaId) return null;
    const { data, error } = await supabase.from('empresas').select('*').eq('id', empresaId).maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async update(changes) {
    const empresaId = await getEmpresaId();
    const map = { name: 'nombre', nit: 'nit', address: 'direccion', phone: 'telefono', email: 'email',
      logoUrl: 'logo_url', primaryColor: 'color_primario', secondaryColor: 'color_secundario', receiptFooter: 'pie_recibo' };
    const patch = {};
    for (const [key, column] of Object.entries(map)) if (key in changes) patch[column] = changes[key];
    const { data, error } = await supabase.from('empresas').update(patch).eq('id', empresaId).select().single();
    if (error) throw error;
    return this.toDomain(data);
  }

  /** No se usa directamente: la creación ocurre dentro de setup_business() (RPC atómica). */
  async save(business) {
    const { data, error } = await supabase
      .from('empresas')
      .insert({ id: business.id, nombre: business.name, nit: business.nit })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }
}
