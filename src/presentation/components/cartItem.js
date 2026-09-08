import { formatCurrency } from '../../shared/utils/format.js';
import { calculateItemSubtotal, calculateItemDiscount } from '../../domain/calculations/saleCalculations.js';

/**
 * renderCartItem
 * ---------------------------------------------------------
 * Responsabilidad: pintar una línea del carrito (sección 21).
 * Todo el cálculo de subtotal/rebaja viene del dominio; este
 * componente solo formatea y delega eventos a los handlers.
 */
export function renderCartItem(item, { onIncrement, onDecrement, onDiscount, onRemove }) {
  const itemSubtotal = calculateItemSubtotal(item.price, item.quantity);
  const finalSubtotal = calculateItemDiscount(itemSubtotal, item.discount ?? 0);

  const el = document.createElement('div');
  el.className = 'cart-item';

  el.innerHTML = `
    <div>
      <div class="cart-item__name">${escapeHtml(item.name)}</div>
      <div class="cart-item__meta">
        ${formatCurrency(item.price)} c/u${item.discount ? ` · rebaja ${formatCurrency(item.discount)}` : ''}
      </div>
    </div>
    <div class="cart-item__subtotal">${formatCurrency(finalSubtotal)}</div>
    <div class="cart-item__controls">
      <div class="stepper">
        <button class="stepper__btn" data-action="decrement" aria-label="Restar">–</button>
        <span class="stepper__value">${item.quantity}</span>
        <button class="stepper__btn" data-action="increment" aria-label="Sumar">+</button>
      </div>
      <button class="cart-item__discount-btn" data-action="discount">Rebaja</button>
      <button class="cart-item__remove-btn" data-action="remove" style="margin-left:auto;">Eliminar</button>
    </div>
  `;

  el.querySelector('[data-action="increment"]').addEventListener('click', () => onIncrement(item));
  el.querySelector('[data-action="decrement"]').addEventListener('click', () => onDecrement(item));
  el.querySelector('[data-action="discount"]').addEventListener('click', () => onDiscount(item));
  el.querySelector('[data-action="remove"]').addEventListener('click', () => onRemove(item));

  return el;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
