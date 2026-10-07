import { openModal, closeAllModals } from './modal.js';
import { renderMovementsPanel } from '../screens/movementsView.js';

/**
 * openMovementsModal
 * ---------------------------------------------------------
 * Acceso rápido a Movimientos desde el topbar del POS, sin salir
 * del punto de venta. Usa exactamente la misma vista que la página
 * "Movimientos" del sidebar (renderMovementsPanel) — un solo lugar
 * con la lógica de filtros, tabla y registro de gastos.
 */
export async function openMovementsModal({ movementUseCases, cashUseCases, onChanged }) {
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';
  body.style.maxHeight = '70vh';
  body.style.overflowY = 'auto';

  openModal({
    id: 'movements',
    title: 'Movimientos de dinero',
    bodyNode: body,
    maxWidth: '760px',
    actions: [{ label: 'Cerrar', variant: 'primary', onClick: closeAllModals }],
  });

  renderMovementsPanel(body, { movementUseCases, cashUseCases, onChanged });
}
