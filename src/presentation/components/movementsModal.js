import { openModal, closeAllModals } from './modal.js';
import { showToast } from './toast.js';
import { formatCurrency, formatDate } from '../../shared/utils/format.js';

/**
 * openMovementsModal
 * ---------------------------------------------------------
 * Responsabilidad: módulo "Movimientos de dinero" (sección 30) con
 * filtros Desde/Hasta, resumen de Ingresos/Egresos/Balance, tabla
 * de movimientos, y el formulario de gastos (sección 31).
 *
 * Regla importante (sección 31):
 *   Si el gasto es "De la caja" y no hay suficiente efectivo, NO se
 *   bloquea — se advierte con Toast y se registra igual, manteniendo
 *   trazabilidad.
 */
export async function openMovementsModal({ movementUseCases, cashUseCases, onChanged }) {
  const filters = { from: null, to: null };

  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';
  body.style.maxHeight = '65vh';
  body.style.overflowY = 'auto';

  async function render() {
    const summary = await movementUseCases.getSummary(filters);
    const movements = await movementUseCases.listMovements(filters);
    body.innerHTML = '';

    // ---- Filtros ----
    const filterRow = document.createElement('div');
    filterRow.style.display = 'flex';
    filterRow.style.gap = '8px';
    filterRow.innerHTML = `
      <label style="display:flex;flex-direction:column;gap:4px;font-size:0.75rem;flex:1;">
        Desde
        <input class="search-input" id="filterFrom" type="date">
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:0.75rem;flex:1;">
        Hasta
        <input class="search-input" id="filterTo" type="date">
      </label>
    `;
    body.appendChild(filterRow);
    filterRow.querySelector('#filterFrom').addEventListener('change', (e) => {
      filters.from = e.target.value ? new Date(e.target.value).toISOString() : null;
      render();
    });
    filterRow.querySelector('#filterTo').addEventListener('change', (e) => {
      filters.to = e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null;
      render();
    });

    // ---- Resumen ----
    [
      ['Ingresos', summary.income, 'var(--color-success)'],
      ['Egresos', summary.expense, 'var(--color-danger)'],
    ].forEach(([label, value, color]) => {
      const row = document.createElement('div');
      row.className = 'summary-row';
      row.innerHTML = `<span>${label}</span><span class="summary-row__value" style="color:${color};">${formatCurrency(value)}</span>`;
      body.appendChild(row);
    });
    const balanceRow = document.createElement('div');
    balanceRow.className = 'summary-row summary-row--total';
    balanceRow.innerHTML = `<span>Balance</span><span class="summary-row__value">${formatCurrency(summary.balance)}</span>`;
    body.appendChild(balanceRow);

    // ---- Tabla de movimientos ----
    const table = document.createElement('div');
    table.style.display = 'flex';
    table.style.flexDirection = 'column';
    table.style.gap = '4px';
    table.style.marginTop = '8px';

    if (movements.length === 0) {
      table.innerHTML = `<p style="font-size:0.875rem; color:var(--color-ink-muted);">Sin movimientos en este rango.</p>`;
    } else {
      movements.forEach((m) => {
        const line = document.createElement('div');
        line.className = 'summary-row';
        const sign = m.type === 'INCOME' ? '+' : '–';
        const color = m.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)';
        line.innerHTML = `
          <span>${formatDate(m.createdAt)} · ${escapeHtml(m.concept)}${m.affectsCash ? '' : ' (no afecta caja)'}</span>
          <span class="summary-row__value" style="color:${color};">${sign}${formatCurrency(m.amount)}</span>
        `;
        table.appendChild(line);
      });
    }
    body.appendChild(table);

    // ---- Registrar gasto (sección 31) ----
    const form = document.createElement('div');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '8px';
    form.style.marginTop = '12px';
    form.style.paddingTop = '12px';
    form.style.borderTop = '1px solid var(--color-border)';
    form.innerHTML = `
      <strong style="font-size:0.875rem;">Registrar gasto</strong>
      <input class="search-input" id="expenseConcept" placeholder="Concepto (ej: Compra de bolsas)">
      <input class="search-input" id="expenseAmount" type="number" min="1" step="1" placeholder="Monto">
      <div style="display:flex; gap:16px; font-size:0.875rem;">
        <label style="display:flex; align-items:center; gap:6px;">
          <input type="radio" name="expenseOrigin" value="cash" checked> De la caja
        </label>
        <label style="display:flex; align-items:center; gap:6px;">
          <input type="radio" name="expenseOrigin" value="record"> Solo registrar
        </label>
      </div>
    `;
    const registerBtn = document.createElement('button');
    registerBtn.className = 'btn btn--secondary';
    registerBtn.textContent = '+ Registrar';
    registerBtn.addEventListener('click', async () => {
      const concept = form.querySelector('#expenseConcept').value.trim();
      const amount = Number(form.querySelector('#expenseAmount').value || 0);
      const wantsCash = form.querySelector('input[name="expenseOrigin"]:checked').value === 'cash';
      if (!concept || amount <= 0) return;

      try {
        const cashStatus = wantsCash ? await cashUseCases.getCashStatus() : null;
        const fromCash = wantsCash && cashStatus != null;

        let warning = null;
        if (wantsCash && !cashStatus) {
          warning = 'no hay caja abierta, se registró sin afectar el saldo físico';
        } else if (fromCash && amount > cashStatus.expectedBalance) {
          warning = 'no hay suficiente efectivo en caja, se registró igualmente';
        }

        await movementUseCases.registerExpense({ concept, amount, fromCash });
        showToast(warning ? `Gasto registrado — ${warning}` : 'Gasto registrado', warning ? 'danger' : 'success');
        onChanged?.();
        render();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });
    form.appendChild(registerBtn);
    body.appendChild(form);
  }

  await render();

  openModal({
    id: 'movements',
    title: 'Movimientos de dinero',
    bodyNode: body,
    actions: [{ label: 'Cerrar', variant: 'primary', onClick: closeAllModals }],
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
