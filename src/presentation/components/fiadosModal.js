import { openModal, closeModal, closeAllModals } from './modal.js';
import { confirmDialog } from './confirmDialog.js';
import { showToast } from './toast.js';
import { formatCurrency, formatDate } from '../../shared/utils/format.js';

/**
 * openFiadosModal
 * ---------------------------------------------------------
 * Responsabilidad: pantalla principal de Fiados (sección 24).
 * Por cada cliente muestra su deuda y permite:
 *   - Registrar abono (reduce la deuda, valida que no exceda)
 *   - Ver historial (ventas fiadas registradas a su nombre)
 *   - Crear un cliente nuevo
 */
export async function openFiadosModal({ customerUseCases }) {
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '10px';
  body.style.maxHeight = '55vh';
  body.style.overflowY = 'auto';

  async function render() {
    const customers = await customerUseCases.listCustomers();
    body.innerHTML = '';

    if (customers.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = 'var(--color-ink-muted)';
      empty.style.fontSize = '0.875rem';
      empty.textContent = 'Todavía no hay clientes registrados.';
      body.appendChild(empty);
    }

    customers.forEach((customer) => {
      const row = document.createElement('div');
      row.style.border = '1px solid var(--color-border)';
      row.style.borderRadius = 'var(--radius-md)';
      row.style.padding = '12px';
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.style.gap = '8px';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.innerHTML = `
        <span style="font-weight:600;">${escapeHtml(customer.name)}</span>
        <span class="customer-card__debt" style="color:${customer.currentDebt > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
          ${formatCurrency(customer.currentDebt)} / cupo ${formatCurrency(customer.creditLimit)}
        </span>
      `;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';

      const payBtn = document.createElement('button');
      payBtn.className = 'btn btn--primary';
      payBtn.style.height = '36px';
      payBtn.textContent = 'Registrar abono';
      payBtn.disabled = customer.currentDebt <= 0;
      payBtn.addEventListener('click', () => openPaymentPrompt(customer));

      const historyBtn = document.createElement('button');
      historyBtn.className = 'btn btn--secondary';
      historyBtn.style.height = '36px';
      historyBtn.textContent = 'Historial';
      historyBtn.addEventListener('click', () => openHistory(customer));

      actions.append(payBtn, historyBtn);
      row.append(header, actions);
      body.appendChild(row);
    });

    // ---- Crear cliente ----
    const form = document.createElement('div');
    form.style.display = 'flex';
    form.style.gap = '8px';
    form.style.marginTop = '4px';
    form.innerHTML = `
      <input class="search-input" id="fiadoNewName" placeholder="Nombre del cliente">
      <input class="search-input" id="fiadoNewLimit" type="number" min="0" step="1" placeholder="Cupo" style="max-width:120px;">
    `;
    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn--secondary';
    createBtn.textContent = '+ Crear';
    createBtn.addEventListener('click', async () => {
      const name = form.querySelector('#fiadoNewName').value.trim();
      const creditLimit = Number(form.querySelector('#fiadoNewLimit').value || 0);
      if (!name) return;
      await customerUseCases.createCustomer({ name, creditLimit });
      showToast('Cliente creado', 'success');
      render();
    });
    form.appendChild(createBtn);
    body.appendChild(form);
  }

  function openPaymentPrompt(customer) {
    const promptBody = document.createElement('div');
    promptBody.innerHTML = `
      <p style="margin-bottom:8px; font-size:0.875rem; color:var(--color-ink-muted);">
        Deuda actual: ${formatCurrency(customer.currentDebt)}
      </p>
      <input class="search-input" id="paymentAmount" type="number" min="1" step="1" placeholder="Monto del abono">
    `;
    openModal({
      title: `Abono de ${customer.name}`,
      bodyNode: promptBody,
      actions: [
        { label: 'Cancelar', variant: 'secondary', onClick: closeModal },
        {
          label: 'Registrar',
          variant: 'primary',
          onClick: async () => {
            const amount = Number(promptBody.querySelector('#paymentAmount').value || 0);
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
    const historyBody = document.createElement('div');
    historyBody.style.display = 'flex';
    historyBody.style.flexDirection = 'column';
    historyBody.style.gap = '8px';
    historyBody.style.maxHeight = '40vh';
    historyBody.style.overflowY = 'auto';

    if (sales.length === 0) {
      historyBody.innerHTML = `<p style="font-size:0.875rem; color:var(--color-ink-muted);">Sin ventas fiadas registradas.</p>`;
    } else {
      sales.forEach((sale) => {
        const line = document.createElement('div');
        line.className = 'summary-row';
        line.innerHTML = `
          <span>${formatDate(sale.createdAt)} · ${sale.items.length} producto(s)</span>
          <span class="summary-row__value">${formatCurrency(sale.total)}</span>
        `;
        historyBody.appendChild(line);
      });
    }

    openModal({
      title: `Historial de ${customer.name}`,
      bodyNode: historyBody,
      actions: [{ label: 'Cerrar', variant: 'secondary', onClick: closeModal }],
    });
  }

  await render();

  openModal({
    id: 'fiados',
    title: 'Fiados',
    bodyNode: body,
    actions: [{ label: 'Cerrar', variant: 'primary', onClick: closeAllModals }],
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
