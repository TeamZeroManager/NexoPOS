import { MovementRepository } from '../../domain/repositories/MovementRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

export class SupabaseMovementRepository extends MovementRepository {
  toDomain(row) {
    if (!row) return null;
    return {
      id: row.id,
      type: row.tipo,
      concept: row.concepto,
      amount: row.monto,
      affectsCash: row.afecta_caja,
      referenceId: row.referencia_id,
      createdAt: row.created_at,
    };
  }

  async findAll() {
    const { data, error } = await supabase.from('movimientos_caja').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async findByDateRange(from, to) {
    let query = supabase.from('movimientos_caja').select('*').order('created_at', { ascending: false });
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    const { data, error } = await query;
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async save(movement) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('movimientos_caja')
      .insert({
        id: movement.id,
        empresa_id: empresaId,
        tipo: movement.type,
        concepto: movement.concept,
        monto: movement.amount,
        afecta_caja: movement.affectsCash,
        referencia_id: movement.referenceId,
      })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }
}
