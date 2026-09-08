import { showToast } from '../components/toast.js';
import { formatCurrency, formatDate } from '../../shared/utils/format.js';

/**
 * makeCashScreen
 * ---------------------------------------------------------
 * Responsabilidad: vista de página equivalente al modal de Caja
 * (sección 32), para acceso directo desde el sidebar.
 */
export function makeCashScreen({ cashUseCases, onChanged }) {
  const container = document.getElementById('pageCaja');

  async function render() {
    const status = await cashUseCases.getCashStatus();
    container.innerHTML = '';

    const section = document.createElement('div');
    section.className = 'card-section';

    if (!status) {
      section.innerHTML = `
        <p style="font-size:0.875rem; color:var(--color-ink-muted); margin-bottom:12px;">No hay una caja abierta.</p>
        <label class="field-label" style="margin-bottom:12px;">
          Saldo inicial (pesos)
          <input class="search-input" id="openingAmountInput" type="number" min="0" step="1" placeholder="Ej: 50000">
        </label>
        <button class="btn btn--primary" id="btnOpen">Abrir caja</button>
      `;
      container.appendChild(section);
      section.querySelector('#btnOpen').addEventListener('click', async () => {
        const amount = Number(section.querySelector('#openingAmountInput').value || 0);
        try {
          await cashUseCases.openRegister(amount);
          showToast('Caja abierta', 'success');
          onChanged?.();
          render();
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
      return;
    }

    section.innerHTML = `
      <div class="summary-row"><span>Apertura</span><span class="summary-row__value">${formatCurrency(status.openingAmount)}</span></div>
      <div class="summary-row"><span>Abierta desde</span><span class="summary-row__value">${formatDate(status.openedAt)}</span></div>
      <div class="summary-row"><span>Ventas en efectivo</span><span class="summary-row__value">${formatCurrency(status.cashIncome)}</span></div>
      <div class="summary-row"><span>Egresos</span><span class="summary-row__value">–${formatCurrency(status.cashExpense)}</span></div>
      <div class="summary-row summary-row--total"><span>Saldo esperado</span><span class="summary-row__value">${formatCurrency(status.expectedBalance)}</span></div>
      <label class="field-label" style="margin:16px 0 12px;">
        Efectivo contado (pesos)
        <input class="search-input" id="countedCashInput" type="number" min="0" step="1" placeholder="Cuenta el efectivo físico">
      </label>
      <div id="diffResult" style="margin-bottom:12px;"></div>
      <button class="btn btn--primary" id="btnClose">Confirmar cierre</button>
    `;
    container.appendChild(section);

    const countedInput = section.querySelector('#countedCashInput');
    const diffResult = section.querySelector('#diffResult');
    countedInput.addEventListener('input', () => {
      diffResult.innerHTML = '';
      if (countedInput.value === '') return;
      const diff = Number(countedInput.value) - status.expectedBalance;
      const badge = document.createElement('div');
      badge.className = `badge ${diff === 0 ? 'badge--success' : diff > 0 ? 'badge--pending' : 'badge--danger'}`;
      badge.style.height = 'auto';
      badge.style.padding = '8px 12px';
      badge.textContent = diff === 0 ? 'Cuadra exacto' : diff > 0 ? `Sobrante: ${formatCurrency(diff)}` : `Faltante: ${formatCurrency(Math.abs(diff))}`;
      diffResult.appendChild(badge);
    });

    section.querySelector('#btnClose').addEventListener('click', async () => {
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
  }

  return { render };
}
