import { openCashModal } from '../components/cashModal.js';
import { openMovementsModal } from '../components/movementsModal.js';

/**
 * initTopbarActions
 * ---------------------------------------------------------
 * Responsabilidad: conectar los botones "Caja" y "Movimientos"
 * del topbar con sus modales (secciones 30-32). El badge de caja
 * refleja en vivo si hay una caja abierta o no.
 */
export function initTopbarActions({ cashUseCases, movementUseCases }) {
  const btnCash = document.getElementById('btnCash');
  const btnMovements = document.getElementById('btnMovements');

  async function refreshCashBadge() {
    const status = await cashUseCases.getCashStatus();
    if (status) {
      btnCash.textContent = 'Caja abierta';
      btnCash.className = 'badge badge--success';
    } else {
      btnCash.textContent = 'Caja cerrada';
      btnCash.className = 'badge badge--danger';
    }
    btnCash.style.border = 'none';
    btnCash.style.cursor = 'pointer';
  }

  btnCash.addEventListener('click', () => {
    openCashModal({ cashUseCases, onChanged: refreshCashBadge });
  });

  btnMovements.addEventListener('click', () => {
    openMovementsModal({ movementUseCases, cashUseCases });
  });

  refreshCashBadge();

  return { refreshCashBadge };
}
