import { CashRepository } from '../../domain/repositories/CashRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

export class SupabaseCashRepository extends CashRepository {
  toDomain(row) {
    if (!row) return null;
    return {
      id: row.id,
      openingAmount: row.monto_apertura,
      cashBalance: row.saldo_cierre ?? row.monto_apertura,
      status: row.estado,
      openedAt: row.abierta_en,
      closedAt: row.cerrada_en,
    };
  }

  async getCurrent() {
    const { data, error } = await supabase.from('cajas').select('*').eq('estado', 'OPEN').maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async save(cashRegister) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('cajas')
      .insert({
        id: cashRegister.id,
        empresa_id: empresaId,
        monto_apertura: cashRegister.openingAmount,
        estado: cashRegister.status,
      })
      .select()
      .single();
    if (error) throw this.friendly(error);
    return this.toDomain(data);
  }

  /** 23505 = índice único (una sola caja abierta); 42501 = RLS (falta OPEN_CLOSE_CASH). */
  friendly(error) {
    if (error?.code === '23505') return new Error('Ya hay una caja abierta');
    if (error?.code === '42501') return new Error('No tienes permiso para abrir o cerrar la caja');
    return error;
  }

  async update(id, changes) {
    const patch = {};
    if ('status' in changes) patch.estado = changes.status;
    if ('closedAt' in changes) patch.cerrada_en = changes.closedAt;
    if ('cashBalance' in changes) patch.saldo_cierre = changes.cashBalance;
    const { data, error } = await supabase.from('cajas').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw this.friendly(error);
    return this.toDomain(data);
  }
}
