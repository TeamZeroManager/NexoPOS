import { formatCurrency, formatDate } from '../../shared/utils/format.js';
import { el, badge, button, kpi, table, formModal } from '../components/dom.js';
import { showToast } from '../components/toast.js';

const STATUS = { OK: ['Normal', 'success'], LOW: ['Stock bajo', 'pending'], OUT: ['Sin stock', 'danger'] };
const TYPE_LABEL = { COMPRA: 'Compra', VENTA: 'Venta', AJUSTE: 'Ajuste', DEVOLUCION: 'Devolución' };

/** Inventario: existencias valorizadas, alertas de stock mínimo, ajustes con motivo e historial. */
export function makeInventarioScreen({ inventoryUseCases }) {
  const container = document.getElementById('pageInventario');
  const state = { tab: 'stock', term: '', onlyAlerts: false, products: [], movements: [] };

  async function load() {
    state.products = await inventoryUseCases.listStock();
    if (state.tab === 'history') state.movements = await inventoryUseCases.listMovements();
  }

  function openAdjust(p) {
    formModal({
      id: 'adjust-stock', title: `Ajustar "${p.name}"`, submitLabel: 'Aplicar ajuste',
      fields: [
        { name: 'newStock', label: `Nuevo stock (actual: ${p.stock})`, type: 'number', min: 0, step: 1, required: true, value: p.stock },
        { name: 'minStock', label: 'Stock mínimo (alerta)', type: 'number', min: 0, step: 1, required: true, value: p.minStock },
        { name: 'reason', label: 'Motivo', required: true, placeholder: 'Ej: conteo físico, merma, vencimiento', hint: 'Queda registrado en el historial.' },
      ],
      onSubmit: async (v) => {
        await inventoryUseCases.adjustStock({ productId: p.id, newStock: v.newStock, minStock: v.minStock, reason: v.reason });
        showToast('Inventario actualizado', 'success');
        await render();
      },
    });
  }

  function stockView() {
    const s = inventoryUseCases.summarize(state.products);
    const term = state.term.toLowerCase();
    const rows = state.products
      .filter((p) => p.active && (!state.onlyAlerts || p.stockStatus !== 'OK'))
      .filter((p) => !term || p.name.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term))
      .map((p) => [
        p.name, p.sku ?? '—', String(p.stock), String(p.minStock),
        badge(...STATUS[p.stockStatus]), formatCurrency((p.cost ?? 0) * p.stock),
        button('Ajustar', () => openAdjust(p)),
      ]);
    const search = el('input', { className: 'search-input', placeholder: 'Buscar por nombre o SKU', value: state.term, style: 'flex:1;min-width:180px;' });
    search.addEventListener('input', (e) => {
      state.term = e.target.value;
      renderView();
      const next = container.querySelector('input.search-input'); // el DOM se rehízo: recuperar foco y cursor
      next.focus();
      next.setSelectionRange(next.value.length, next.value.length);
    });
    const alerts = el('input', { type: 'checkbox', checked: state.onlyAlerts });
    alerts.addEventListener('change', (e) => { state.onlyAlerts = e.target.checked; renderView(); });
    return el('div', {}, [
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;' }, [
        kpi('Unidades en stock', String(s.units)),
        kpi('Valor al costo', formatCurrency(s.costValue), 'Productos sin costo cuentan $0'),
        kpi('Valor a precio de venta', formatCurrency(s.saleValue)),
        kpi('Alertas', `${s.low} bajo · ${s.out} sin stock`),
      ]),
      el('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap;' }, [
        search, el('label', { style: 'display:flex;gap:6px;align-items:center;font-size:0.875rem;' }, [alerts, 'Solo alertas']),
      ]),
      table(['Producto', 'SKU', 'Stock', 'Mínimo', 'Estado', 'Valor (costo)', ''], rows, 'No hay productos que coincidan.'),
    ]);
  }

  function historyView() {
    const rows = state.movements.map((m) => [
      formatDate(m.createdAt), m.productName, TYPE_LABEL[m.type] ?? m.type,
      el('strong', { textContent: `${m.quantity > 0 ? '+' : ''}${m.quantity}`, style: `color:${m.quantity < 0 ? 'var(--color-danger,#c0392b)' : 'inherit'}` }),
      m.reason ?? '—', m.userName ?? '—',
    ]);
    return el('div', {}, [
      el('div', { textContent: 'Últimos 200 movimientos de inventario.', style: 'font-size:0.875rem;color:var(--color-ink-muted);margin-bottom:8px;' }),
      table(['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Motivo', 'Usuario'], rows, 'Aún no hay movimientos.'),
    ]);
  }

  function renderView() {
    const tabs = el('div', { style: 'display:flex;gap:8px;margin-bottom:12px;' }, [
      button('Existencias', async () => { state.tab = 'stock'; await render(); }, state.tab === 'stock' ? 'primary' : 'secondary'),
      button('Historial', async () => { state.tab = 'history'; await render(); }, state.tab === 'history' ? 'primary' : 'secondary'),
    ]);
    container.replaceChildren(el('div', { className: 'card-section' }, [tabs, state.tab === 'stock' ? stockView() : historyView()]));
  }

  async function render() {
    await load();
    renderView();
  }
  return { render };
}
