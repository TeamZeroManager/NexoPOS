import { formatCurrency, formatDate } from '../../shared/utils/format.js';
import { el, badge, button, table, formModal } from '../components/dom.js';
import { showToast } from '../components/toast.js';

const METHOD_LABELS = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', CREDIT: 'Fiado' };
const STATUS = { COMPLETED: ['Completada', 'success'], CREDIT: ['Fiada', 'pending'], CANCELLED: ['Anulada', 'danger'], PENDING: ['Pendiente', 'pending'] };
const CANCELLABLE = new Set(['COMPLETED', 'CREDIT']);

/**
 * makeSalesHistoryScreen
 * ---------------------------------------------------------
 * Lista las ventas (más recientes primero). Quien tenga CANCEL_SALES puede anular
 * una venta: se repone el stock, se revierte la caja (o la deuda si fue fiada) y
 * queda el motivo. La base vuelve a verificar el permiso: ocultar el botón es solo UX.
 */
export function makeSalesHistoryScreen({ saleUseCases, canCancel = false }) {
  const container = document.getElementById('pageVentas');

  function openCancel(sale) {
    formModal({
      id: 'cancel-sale',
      title: `Anular venta de ${formatCurrency(sale.total)}`,
      submitLabel: 'Anular venta',
      fields: [{ name: 'reason', label: 'Motivo de la anulación', required: true, placeholder: 'Ej: producto devuelto, error de cobro', hint: 'Se repone el inventario y se revierte el dinero. No se puede deshacer.' }],
      onSubmit: async ({ reason }) => {
        await saleUseCases.cancelSale(sale.id, reason);
        showToast('Venta anulada', 'success');
        await render();
      },
    });
  }

  async function render() {
    const sales = (await saleUseCases.listAllSales()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const rows = sales.map((s) => [
      formatDate(s.createdAt),
      `${s.items.length} producto(s)`,
      METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod,
      el('span', { style: 'display:inline-flex;flex-direction:column;gap:2px;' }, [
        badge(...(STATUS[s.status] ?? [s.status, 'pending'])),
        s.cancelReason ? el('small', { textContent: s.cancelReason, style: 'color:var(--color-ink-muted);' }) : null,
      ]),
      el('span', { textContent: formatCurrency(s.total), style: 'font-family:var(--font-money);' }),
      canCancel && CANCELLABLE.has(s.status) ? button('Anular', () => openCancel(s)) : '',
    ]);
    container.replaceChildren(el('div', { className: 'card-section' }, [
      el('strong', { textContent: `Ventas (${sales.length})`, style: 'display:block;margin-bottom:8px;' }),
      table(['Fecha', 'Productos', 'Método', 'Estado', 'Total', ''], rows, 'Todavía no hay ventas registradas.'),
    ]));
  }

  return { render };
}
