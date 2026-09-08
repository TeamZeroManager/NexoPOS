import { openModal, closeModal, closeAllModals } from './modal.js';

/**
 * openHoldSaleModal
 * ---------------------------------------------------------
 * Responsabilidad: pedir un nombre para identificar la venta en
 * espera (sección 23), ej: "Mesa 1", "Juan", "Pedido domicilio".
 */
export function openHoldSaleModal({ onConfirm }) {
  const body = document.createElement('div');
  body.innerHTML = `
    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
      Nombre para identificar esta venta
      <input class="search-input" id="holdSaleName" placeholder="Ej: Mesa 1, Juan, Domicilio...">
    </label>
  `;

  openModal({
    id: 'hold-sale',
    title: 'Guardar en espera',
    bodyNode: body,
    actions: [
      { label: 'Cancelar', variant: 'secondary', onClick: closeAllModals },
      {
        label: 'Guardar',
        variant: 'primary',
        onClick: () => {
          const name = body.querySelector('#holdSaleName').value.trim();
          if (!name) return;
          closeAllModals();
          onConfirm(name);
        },
      },
    ],
  });
}
