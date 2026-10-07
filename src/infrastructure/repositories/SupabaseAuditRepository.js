import { supabase } from '../supabaseClient.js';

export class SupabaseAuditRepository {
  async find({ table = '', action = '', fromIso = null, toIso = null, limit = 50, offset = 0 } = {}) {
    let q = supabase.from('auditoria').select('*, usuarios(nombre)', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (table) q = q.eq('tabla', table);
    if (action) q = q.eq('accion', action);
    if (fromIso) q = q.gte('created_at', fromIso);
    if (toIso) q = q.lt('created_at', toIso);
    const { data, error, count } = await q;
    if (error) throw error;
    return {
      total: count ?? 0,
      rows: data.map((r) => ({ id: r.id, table: r.tabla, action: r.accion, recordId: r.registro_id, before: r.antes, after: r.despues, userName: r.usuarios?.nombre ?? 'Sistema', createdAt: r.created_at })),
    };
  }
}
