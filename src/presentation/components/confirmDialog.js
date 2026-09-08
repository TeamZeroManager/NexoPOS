import { openModal, closeModal } from './modal.js';

/**
 * confirmDialog
 * ---------------------------------------------------------
 * Responsabilidad: pedir confirmación antes de una acción
 * destructiva (eliminar categoría, eliminar producto), en vez
 * de usar window.confirm().
 *
 * Salida: Promise<boolean> - true si el usuario confirmó.
 */
export function confirmDialog({ title, message, confirmLabel = 'Confirmar' }) {
  return new Promise((resolve) => {
    const body = document.createElement('p');
    body.textContent = message;

    openModal({
      title,
      bodyNode: body,
      actions: [
        {
          label: 'Cancelar',
          variant: 'secondary',
          onClick: () => {
            closeModal();
            resolve(false);
          },
        },
        {
          label: confirmLabel,
          variant: 'primary',
          onClick: () => {
            closeModal();
            resolve(true);
          },
        },
      ],
    });
  });
}
