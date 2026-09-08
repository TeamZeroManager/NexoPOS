import { openModal, closeAllModals } from './modal.js';
import { showToast } from './toast.js';
import { formatCurrency, formatDate } from '../../shared/utils/format.js';

/**
 * openCashModal
 * ---------------------------------------------------------
 * Responsabilidad: pantalla de Caja (sección 32).
 *   - Sin caja abierta: formulario de apertura (saldo inicial).
 *   - Con caja abierta: muestra apertura, ventas en efectivo,
 *     egresos y saldo esperado en vivo, con botón para cerrarla.
 *   - Al cerrar: pide el efectivo contado y muestra la diferencia
 *     (sobrante en verde, faltante en rojo).
 */
export async function openCashModal({ cashUseCases, onChanged }) {
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';

  async function render() {
    const status = await cashUseCases.getCashStatus();
    body.innerHTML = '';

    if (!status) {
      body.appendChild(renderOpenForm());
      return;
    }

    const rows = [
      ['Apertura', formatCurrency(status.openingAmount)],
      ['Abierta desde', formatDate(status.openedAt)],
      ['Ventas en efectivo', formatCurrency(status.cashIncome)],
      ['Egresos', `–${formatCurrency(status.cashExpense)}`],
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'summary-row';
      row.innerHTML = `<span>${label}</span><span class="summary-row__value">${value}</span>`;
      body.appendChild(row);
    });

    const totalRow = document.createElement('div');
    totalRow.className = 'summary-row summary-row--total';
    totalRow.innerHTML = `<span>Saldo esperado</span><span class="summary-row__value">${formatCurrency(status.expectedBalance)}</span>`;
    body.appendChild(totalRow);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn--primary';
    closeBtn.textContent = 'Cerrar caja';
    closeBtn.addEventListener('click', () => renderCloseForm(status));
    body.appendChild(closeBtn);
  }

  function renderOpenForm() {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '12px';
    wrapper.innerHTML = `
      <p style="font-size:0.875rem; color:var(--color-ink-muted);">No hay una caja abierta.</p>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
        Saldo inicial (pesos)
        <input class="search-input" id="openingAmountInput" type="number" min="0" step="1" placeholder="Ej: 50000">
      </label>
    `;
    const openBtn = document.createElement('button');
    openBtn.className = 'btn btn--primary';
    openBtn.textContent = 'Abrir caja';
    openBtn.addEventListener('click', async () => {
      const amount = Number(wrapper.querySelector('#openingAmountInput').value || 0);
      try {
        await cashUseCases.openRegister(amount);
        showToast('Caja abierta', 'success');
        onChanged?.();
        render();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });
    wrapper.appendChild(openBtn);
    return wrapper;
  }

  function renderCloseForm(status) {
    body.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '12px';
    wrapper.innerHTML = `
      <div class="summary-row summary-row--total">
        <span>Saldo esperado</span><span class="summary-row__value">${formatCurrency(status.expectedBalance)}</span>
      </div>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
        Efectivo contado (pesos)
        <input class="search-input" id="countedCashInput" type="number" min="0" step="1" placeholder="Cuenta el efectivo físico">
      </label>
      <div id="differenceResult"></div>
    `;

    const countedInput = wrapper.querySelector('#countedCashInput');
    const resultEl = wrapper.querySelector('#differenceResult');

    countedInput.addEventListener('input', () => {
      const counted = Number(countedInput.value || 0);
      const diff = counted - status.expectedBalance;
      resultEl.innerHTML = '';
      if (countedInput.value === '') return;
      const badge = document.createElement('div');
      badge.className = `badge ${diff === 0 ? 'badge--success' : diff > 0 ? 'badge--pending' : 'badge--danger'}`;
      badge.style.fontSize = '0.9375rem';
      badge.style.height = 'auto';
      badge.style.padding = '8px 12px';
      badge.textContent =
        diff === 0 ? 'Cuadra exacto' : diff > 0 ? `Sobrante: ${formatCurrency(diff)}` : `Faltante: ${formatCurrency(Math.abs(diff))}`;
      resultEl.appendChild(badge);
    });

    const confirmCloseBtn = document.createElement('button');
    confirmCloseBtn.className = 'btn btn--primary';
    confirmCloseBtn.textContent = 'Confirmar cierre';
    confirmCloseBtn.addEventListener('click', async () => {
      const counted = Number(countedInput.value || 0);
      try {
        await cashUseCases.closeRegister(counted);
        showToast('Caja cerrada', 'success');
        onChanged?.();
        render();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });

    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn--ghost';
    backBtn.textContent = '← Volver';
    backBtn.addEventListener('click', render);

    wrapper.append(confirmCloseBtn, backBtn);
    body.appendChild(wrapper);
  }

  await render();

  openModal({
    id: 'cash',
    title: 'Caja',
    bodyNode: body,
    actions: [{ label: 'Cerrar ventana', variant: 'secondary', onClick: closeAllModals }],
  });
}
