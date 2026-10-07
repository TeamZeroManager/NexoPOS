import { formatCurrency } from '../../shared/utils/format.js';
import { el, button, kpi, table } from '../components/dom.js';
import { showToast } from '../components/toast.js';

const METHOD = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', CREDIT: 'Fiado' };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function presets() {
  const now = new Date();
  const day = (offset) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  return [
    ['Hoy', day(0), day(0)],
    ['Últimos 7 días', day(-6), day(0)],
    ['Este mes', iso(new Date(now.getFullYear(), now.getMonth(), 1)), day(0)],
    ['Mes anterior', iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))],
  ];
}

/** Reportes: ventas por periodo, método de pago, productos más vendidos y utilidad estimada. */
export function makeReportesScreen({ reportUseCases }) {
  const container = document.getElementById('pageReportes');
  const range = { from: presets()[2][1], to: presets()[2][2] };

  function bars(rows, labelOf, valueOf) {
    const max = Math.max(1, ...rows.map(valueOf));
    return el('div', { style: 'display:flex;flex-direction:column;gap:6px;' }, rows.map((r) =>
      el('div', { style: 'display:flex;align-items:center;gap:8px;font-size:0.8rem;' }, [
        el('span', { textContent: labelOf(r), style: 'width:92px;flex:none;' }),
        el('div', { style: 'flex:1;background:var(--color-border);border-radius:4px;height:14px;' }, [
          el('div', { style: `width:${Math.max(2, (valueOf(r) / max) * 100)}%;height:100%;background:var(--color-primary);border-radius:4px;` })]),
        el('span', { textContent: formatCurrency(valueOf(r)), style: 'width:96px;text-align:right;flex:none;' }),
      ])));
  }

  function section(title, node) {
    return el('div', { className: 'card-section', style: 'margin-top:12px;' }, [el('strong', { textContent: title, style: 'display:block;margin-bottom:8px;' }), node]);
  }

  function drawReport(r) {
    const out = container.querySelector('#reportBody');
    const t = r.totals;
    if (t.sales === 0) return out.replaceChildren(el('div', { className: 'empty-state', textContent: 'No hay ventas en este periodo.' }));
    const profitHint = r.productsWithoutCost > 0
      ? `Estimada con el costo actual. ${r.productsWithoutCost} producto(s) vendidos sin costo cuentan $0.`
      : 'Estimada con el costo actual de cada producto.';
    out.replaceChildren(
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:10px;' }, [
        kpi('Ingresos', formatCurrency(t.income)), kpi('Ventas', String(t.sales)),
        kpi('Ticket promedio', formatCurrency(t.averageTicket)), kpi('Descuentos', formatCurrency(t.discounts)),
        kpi('Fiado en el periodo', formatCurrency(t.credit), 'Vendido a crédito, aún no cobrado'),
        kpi('Utilidad estimada', formatCurrency(r.estimatedProfit), profitHint),
      ]),
      section('Ventas por día', bars(r.byDay, (d) => String(d.day).slice(5), (d) => d.total)),
      section('Por método de pago', bars(r.byMethod, (m) => METHOD[m.method] ?? m.method, (m) => m.total)),
      section('Productos más vendidos', table(['Producto', 'Unidades', 'Ingresos'], r.topProducts.map((p) => [p.name, String(p.units), formatCurrency(p.income)]))),
    );
  }

  async function run() {
    const out = container.querySelector('#reportBody');
    out.replaceChildren(el('div', { textContent: 'Calculando…', style: 'padding:16px;color:var(--color-ink-muted);' }));
    try {
      drawReport(await reportUseCases.getSalesReport(range));
    } catch (e) {
      out.replaceChildren();
      showToast(e.message, 'danger');
    }
  }

  function render() {
    const from = el('input', { type: 'date', className: 'search-input', value: range.from });
    const to = el('input', { type: 'date', className: 'search-input', value: range.to });
    const apply = button('Ver reporte', () => { range.from = from.value; range.to = to.value; run(); }, 'primary');
    const chips = presets().map(([label, f, t]) => button(label, () => { range.from = f; range.to = t; from.value = f; to.value = t; run(); }));
    container.replaceChildren(
      el('div', { className: 'card-section' }, [
        el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;' }, [...chips, from, to, apply]),
      ]),
      el('div', { id: 'reportBody' }),
    );
    return run();
  }
  return { render };
}
