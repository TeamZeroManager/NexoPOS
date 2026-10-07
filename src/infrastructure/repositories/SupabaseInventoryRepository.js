import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

/** Ajustes de stock (RPC atómica ajustar_inventario) e historial de movimientos de inventario. */
export class SupabaseInventoryRepository {
  async adjust({ productId, newStock, reason, minStock = null }) {
    const { error } = await supabase.rpc('ajustar_inventario', {
      p_empresa_id: await getEmpresaId(), p_producto_id: productId,
      p_nuevo_stock: newStock, p_motivo: reason, p_stock_minimo: minStock,
    });
    if (error) throw new Error(error.message);
  }

  async findMovements({ limit = 200 } = {}) {
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('*, productos(nombre), usuarios(nombre)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map((r) => ({
      id: r.id, productName: r.productos?.nombre ?? '(eliminado)', type: r.tipo, quantity: r.cantidad,
      reason: r.motivo, userName: r.usuarios?.nombre ?? null, createdAt: r.created_at,
    }));
  }
}
