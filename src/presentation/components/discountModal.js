import { openModal, closeModal, closeAllModals } from './modal.js';
import { showToast } from './toast.js';

/**
 * openDiscountModal
 * ---------------------------------------------------------
 * Responsabilidad: pedir el monto de rebaja para una línea del
 * carrito (sección 22). No valida el monto — eso lo hace
 * validateDiscount() dentro de cartStore.setDiscount, aquí solo
 * se atrapa el error para mostrarlo con Toast.
 */
export function openDiscountModal({ item, onApply }) {
  const body = document.createElement('div');
  body.innerHTML = `
    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
      Rebaja para "${escapeHtml(item.name)}" (pesos)
      <input class="search-input" id="discountInput" type="number" min="0" step="1" value="${item.discount ?? 0}">
    </label>
  `;

  openModal({
    id: 'discount',
    title: 'Aplicar rebaja',
    bodyNode: body,
    actions: [
      { label: 'Cancelar', variant: 'secondary', onClick: closeAllModals },
      {
        label: 'Aplicar',
        variant: 'primary',
        onClick: () => {
          const value = Number(body.querySelector('#discountInput').value || 0);
          try {
            onApply(value);
            closeAllModals();
          } catch (error) {
            showToast(error.message, 'danger');
          }
        },
      },
    ],
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
