import { HeldSaleRepository } from '../../domain/repositories/HeldSaleRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

export class SupabaseHeldSaleRepository extends HeldSaleRepository {
  toDomain(row) {
    if (!row) return null;
    return { id: row.id, name: row.nombre, items: row.items, createdAt: row.created_at };
  }

  async findAll() {
    const { data, error } = await supabase.from('ventas_en_espera').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async findById(id) {
    const { data, error } = await supabase.from('ventas_en_espera').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async save(heldSale) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('ventas_en_espera')
      .insert({ id: heldSale.id, empresa_id: empresaId, nombre: heldSale.name, items: heldSale.items })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }

  async delete(id) {
    const { error } = await supabase.from('ventas_en_espera').delete().eq('id', id);
    if (error) throw error;
  }
}
