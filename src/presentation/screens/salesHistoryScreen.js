import { formatCurrency, formatDate } from '../../shared/utils/format.js';

const METHOD_LABELS = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', CREDIT: 'Fiado' };
const STATUS_BADGE = { COMPLETED: 'badge--success', CREDIT: 'badge--pending', CANCELLED: 'badge--danger', PENDING: 'badge--pending' };
const STATUS_LABEL = { COMPLETED: 'Completada', CREDIT: 'Fiada', CANCELLED: 'Anulada', PENDING: 'Pendiente' };

/**
 * makeSalesHistoryScreen
 * ---------------------------------------------------------
 * Responsabilidad: listar las ventas registradas (más recientes
 * primero). Es de solo lectura — anular ventas queda para una
 * fase futura (sección 39, ya preparada en el dominio).
 */
export function makeSalesHistoryScreen({ saleUseCases }) {
  const container = document.getElementById('pageVentas');

  async function render() {
    const sales = (await saleUseCases.listAllSales()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    container.innerHTML = `
      <div class="card-section">
        <strong style="display:block;margin-bottom:8px;">Ventas (${sales.length})</strong>
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Productos</th><th>Método</th><th>Estado</th><th>Total</th></tr></thead>
          <tbody>
            ${
              sales.length === 0
                ? `<tr><td colspan="5" style="color:var(--color-ink-muted);">Todavía no hay ventas registradas.</td></tr>`
                : sales
                    .map(
                      (s) => `
              <tr>
                <td>${formatDate(s.createdAt)}</td>
                <td>${s.items.length} producto(s)</td>
                <td>${METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}</td>
                <td><span class="badge ${STATUS_BADGE[s.status] ?? ''}">${STATUS_LABEL[s.status] ?? s.status}</span></td>
                <td style="font-family:var(--font-money);">${formatCurrency(s.total)}</td>
              </tr>
            `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    `;
  }

  return { render };
}
