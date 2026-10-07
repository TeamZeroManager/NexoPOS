import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

/** Reporte de ventas agregado en PostgreSQL (rpc reporte_ventas). */
export class SupabaseReportRepository {
  async salesReport({ fromIso, toIso }) {
    const { data, error } = await supabase.rpc('reporte_ventas', {
      p_empresa_id: await getEmpresaId(), p_desde: fromIso, p_hasta: toIso,
      p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota',
    });
    if (error) throw new Error(error.message);
    return {
      totals: { sales: data.totales.ventas, income: data.totales.ingresos, discounts: data.totales.descuentos, averageTicket: data.totales.ticket_promedio, credit: data.totales.fiado },
      byDay: data.por_dia.map((d) => ({ day: d.dia, sales: d.ventas, total: d.total })),
      byMethod: data.por_metodo.map((m) => ({ method: m.metodo_pago, sales: m.ventas, total: m.total })),
      topProducts: data.top_productos.map((p) => ({ productId: p.producto_id, name: p.nombre, units: p.unidades, income: p.ingresos })),
      estimatedProfit: data.utilidad_estimada,
      productsWithoutCost: data.productos_sin_costo,
    };
  }
}
