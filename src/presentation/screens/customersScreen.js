import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatDate } from '../../shared/utils/format.js';

/**
 * makeCustomersScreen
 * ---------------------------------------------------------
 * Responsabilidad: vista de página equivalente al modal de
 * Fiados (sección 24), para acceso directo desde el sidebar.
 * Comparte los mismos casos de uso que el botón "Fiados" del POS.
 */
export function makeCustomersScreen({ customerUseCases }) {
  const container = document.getElementById('pageClientes');

  async function render() {
    const customers = await customerUseCases.listCustomers();

    container.innerHTML = `
      <div class="card-section">
        <strong style="display:block;margin-bottom:8px;">Clientes (${customers.length})</strong>
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Deuda</th><th>Cupo</th><th></th></tr></thead>
          <tbody>
            ${
              customers.length === 0
                ? `<tr><td colspan="4" style="color:var(--color-ink-muted);">Todavía no hay clientes registrados.</td></tr>`
                : customers
                    .map(
                      (c) => `
              <tr>
                <td>${escapeHtml(c.name)}</td>
                <td style="font-family:var(--font-money); color:${c.currentDebt > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">${formatCurrency(c.currentDebt)}</td>
                <td style="font-family:var(--font-money);">${formatCurrency(c.creditLimit)}</td>
                <td style="display:flex; gap:8px;">
                  <button class="btn btn--secondary" style="height:32px;" data-pay="${c.id}" ${c.currentDebt <= 0 ? 'disabled' : ''}>Abono</button>
                  <button class="btn btn--ghost" style="height:32px;" data-history="${c.id}">Historial</button>
                </td>
              </tr>
            `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('[data-pay]').forEach((btn) => {
      btn.addEventListener('click', () => openPaymentPrompt(customers.find((c) => c.id === btn.dataset.pay)));
    });
    container.querySelectorAll('[data-history]').forEach((btn) => {
      btn.addEventListener('click', () => openHistory(customers.find((c) => c.id === btn.dataset.history)));
    });
  }

  function openPaymentPrompt(customer) {
    const body = document.createElement('div');
    body.innerHTML = `
      <p style="margin-bottom:8px; font-size:0.875rem; color:var(--color-ink-muted);">Deuda actual: ${formatCurrency(customer.currentDebt)}</p>
      <input class="search-input" id="payAmount" type="number" min="1" step="1" placeholder="Monto del abono">
    `;
    openModal({
      title: `Abono de ${customer.name}`,
      bodyNode: body,
      actions: [
        { label: 'Cancelar', variant: 'secondary', onClick: closeModal },
        {
          label: 'Registrar',
          variant: 'primary',
          onClick: async () => {
            const amount = Number(body.querySelector('#payAmount').value || 0);
            try {
              await customerUseCases.registerPayment(customer.id, amount);
              closeModal();
              showToast('Abono registrado', 'success');
              render();
            } catch (error) {
              showToast(error.message, 'danger');
            }
          },
        },
      ],
    });
  }

  async function openHistory(customer) {
    const sales = await customerUseCases.getCustomerHistory(customer.id);
    const body = document.createElement('div');
    body.style.maxHeight = '40vh';
    body.style.overflowY = 'auto';
    body.innerHTML =
      sales.length === 0
        ? `<p style="font-size:0.875rem;color:var(--color-ink-muted);">Sin ventas fiadas registradas.</p>`
        : sales
            .map(
              (s) => `
      <div class="summary-row">
        <span>${formatDate(s.createdAt)} · ${s.items.length} producto(s)</span>
        <span class="summary-row__value">${formatCurrency(s.total)}</span>
      </div>`
            )
            .join('');

    openModal({ title: `Historial de ${customer.name}`, bodyNode: body, actions: [{ label: 'Cerrar', variant: 'secondary', onClick: closeModal }] });
  }

  return { render };
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
