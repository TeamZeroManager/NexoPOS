import { openModal, closeAllModals } from './modal.js';
import { showToast } from './toast.js';
import { formatCurrency } from '../../shared/utils/format.js';
import { calculateChange } from '../../domain/calculations/cashCalculations.js';
import { PAYMENT_METHODS } from '../../shared/constants/paymentMethods.js';

const DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

const METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Efectivo',
  [PAYMENT_METHODS.CARD]: 'Tarjeta',
  [PAYMENT_METHODS.TRANSFER]: 'Transferencia',
  [PAYMENT_METHODS.CREDIT]: 'Fiar',
};

/**
 * openPaymentModal
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Recolectar método de pago y (si es efectivo) el monto recibido,
 *   usando el teclado de billetes. NO valida reglas de negocio —
 *   calculateChange() decide si el pago alcanza; este archivo solo
 *   pinta el resultado (🟢/🔴, sección 27) y llama a completeSale()
 *   o registerCreditSale() (sección 24) según el método elegido.
 *
 * Dependencias:
 *   saleUseCases.completeSale / registerCreditSale, cartStore
 */
export function openPaymentModal({ cartStore, saleUseCases, onCompleted }) {
  const { items, total, customer } = cartStore.getState();
  const canFiar = Boolean(customer?.id);

  const availableMethods = [PAYMENT_METHODS.CASH, PAYMENT_METHODS.CARD, PAYMENT_METHODS.TRANSFER];
  if (canFiar) availableMethods.push(PAYMENT_METHODS.CREDIT);

  const state = {
    paymentMethod: null,
    received: 0,
    breakdown: [], // ej: [20000, 20000]
  };

  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '16px';

  function isConfirmEnabled() {
    return (
      state.paymentMethod === PAYMENT_METHODS.CARD ||
      state.paymentMethod === PAYMENT_METHODS.TRANSFER ||
      state.paymentMethod === PAYMENT_METHODS.CREDIT ||
      (state.paymentMethod === PAYMENT_METHODS.CASH && calculateChange(total, state.received).sufficient)
    );
  }

  function findConfirmButton() {
    const overlays = document.querySelectorAll('.modal-overlay');
    const lastOverlay = overlays[overlays.length - 1];
    if (!lastOverlay) return null;
    return Array.from(lastOverlay.querySelectorAll('.modal__actions button')).find(
      (b) => b.textContent === 'Confirmar cobro'
    );
  }

  function updateConfirmState() {
    const btn = findConfirmButton();
    if (btn) btn.disabled = !isConfirmEnabled();
  }

  function render() {
    body.innerHTML = '';

    // ---- Total a cobrar ----
    const totalRow = document.createElement('div');
    totalRow.className = 'summary-row summary-row--total';
    totalRow.innerHTML = `<span>Total a cobrar</span><span class="summary-row__value">${formatCurrency(total)}</span>`;
    body.appendChild(totalRow);

    // ---- Selector de método de pago ----
    const methodRow = document.createElement('div');
    methodRow.style.display = 'flex';
    methodRow.style.gap = '8px';
    Object.values(availableMethods).forEach((method) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-chip';
      btn.textContent = METHOD_LABELS[method];
      btn.setAttribute('aria-pressed', String(state.paymentMethod === method));
      btn.style.flex = '1';
      btn.addEventListener('click', () => {
        state.paymentMethod = method;
        state.received = method === PAYMENT_METHODS.CASH ? 0 : total;
        state.breakdown = [];
        render();
      });
      methodRow.appendChild(btn);
    });
    body.appendChild(methodRow);

    if (state.paymentMethod === PAYMENT_METHODS.CASH) {
      body.appendChild(renderCashSection());
    } else if (state.paymentMethod === PAYMENT_METHODS.CREDIT) {
      const note = document.createElement('p');
      note.style.fontSize = '0.875rem';
      note.style.color = 'var(--color-ink-muted)';
      note.textContent = `Se registrará como venta fiada a nombre de ${customer.name}. La deuda del cliente aumentará ${formatCurrency(total)}.`;
      body.appendChild(note);
    } else if (state.paymentMethod) {
      const note = document.createElement('p');
      note.style.fontSize = '0.875rem';
      note.style.color = 'var(--color-ink-muted)';
      note.textContent = `Se registrará el pago por ${METHOD_LABELS[state.paymentMethod]} por el monto exacto del total.`;
      body.appendChild(note);
    }

    updateConfirmState();
  }

  function renderCashSection() {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '12px';

    // ---- Recibido + estado (sección 27) ----
    const result = calculateChange(total, state.received);
    const statusBadge = document.createElement('div');
    statusBadge.className = `badge ${result.sufficient ? 'badge--success' : 'badge--danger'}`;
    statusBadge.style.fontSize = '0.9375rem';
    statusBadge.style.height = 'auto';
    statusBadge.style.padding = '8px 12px';
    statusBadge.textContent = result.sufficient
      ? `🟢 Cambio: ${formatCurrency(result.change)}`
      : `🔴 Faltan ${formatCurrency(result.remainingAmount)}`;

    const receivedRow = document.createElement('div');
    receivedRow.className = 'summary-row';
    receivedRow.innerHTML = `<span>Recibido</span><span class="summary-row__value">${formatCurrency(state.received)}</span>`;

    wrapper.appendChild(receivedRow);

    if (state.breakdown.length > 0) {
      const breakdownLine = document.createElement('div');
      breakdownLine.style.fontSize = '0.75rem';
      breakdownLine.style.color = 'var(--color-ink-muted)';
      breakdownLine.style.fontFamily = 'var(--font-money)';
      breakdownLine.textContent = state.breakdown.map((n) => formatCurrency(n)).join(' + ');
      wrapper.appendChild(breakdownLine);
    }

    wrapper.appendChild(statusBadge);

    // ---- Teclado de billetes (sección 26) ----
    const keyboard = document.createElement('div');
    keyboard.className = 'money-keyboard';
    DENOMINATIONS.forEach((amount) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'money-btn';
      btn.textContent = formatCurrency(amount);
      btn.addEventListener('click', () => {
        state.received += amount;
        state.breakdown.push(amount);
        render();
      });
      keyboard.appendChild(btn);
    });
    wrapper.appendChild(keyboard);

    // ---- Otro monto (sección 28) ----
    const otherRow = document.createElement('div');
    otherRow.style.display = 'flex';
    otherRow.style.gap = '8px';
    otherRow.innerHTML = `<input class="search-input" id="otherAmountInput" type="number" min="0" step="1" placeholder="Otro monto">`;
    const addOtherBtn = document.createElement('button');
    addOtherBtn.type = 'button';
    addOtherBtn.className = 'btn btn--secondary';
    addOtherBtn.textContent = 'Agregar';
    addOtherBtn.addEventListener('click', () => {
      const input = otherRow.querySelector('#otherAmountInput');
      const value = Number(input.value || 0);
      if (value <= 0) return;
      state.received += value;
      state.breakdown.push(value);
      render();
    });
    otherRow.appendChild(addOtherBtn);
    wrapper.appendChild(otherRow);

    // ---- Limpiar (sección 29) ----
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn--ghost';
    clearBtn.textContent = '🗑 Limpiar';
    clearBtn.addEventListener('click', () => {
      state.received = 0;
      state.breakdown = [];
      render();
    });
    wrapper.appendChild(clearBtn);

    return wrapper;
  }

  render();

  openModal({
    id: 'payment',
    title: 'Cobrar',
    bodyNode: body,
    actions: [
      { label: 'Cancelar', variant: 'secondary', onClick: closeAllModals },
      {
        label: 'Confirmar cobro',
        variant: 'primary',
        onClick: async (event) => {
          if (event.currentTarget.disabled) return;
          try {
            const sale =
              state.paymentMethod === PAYMENT_METHODS.CREDIT
                ? await saleUseCases.registerCreditSale({ items, customerId: customer.id })
                : await saleUseCases.completeSale({
                    items,
                    paymentMethod: state.paymentMethod,
                    received: state.received,
                  });
            closeAllModals();
            cartStore.clear();
            const changeMsg = sale.change > 0 ? ` — cambio ${formatCurrency(sale.change)}` : '';
            const successMsg =
              state.paymentMethod === PAYMENT_METHODS.CREDIT
                ? `Venta fiada a ${customer.name} registrada`
                : `Venta completada${changeMsg}`;
            showToast(successMsg, 'success');
            onCompleted?.();
          } catch (error) {
            showToast(error.message, 'danger');
          }
        },
      },
    ],
  });

  updateConfirmState();
}
