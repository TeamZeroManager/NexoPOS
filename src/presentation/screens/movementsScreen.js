import { renderMovementsPanel } from './movementsView.js';

/**
 * makeMovementsScreen
 * ---------------------------------------------------------
 * Responsabilidad: alojar el módulo de Movimientos como página
 * propia del sidebar (más cómodo que el modal para revisar meses
 * completos). Reutiliza renderMovementsPanel — cero duplicación
 * con el acceso rápido desde el topbar del POS.
 */
export function makeMovementsScreen({ movementUseCases, cashUseCases, onChanged }) {
  const container = document.getElementById('pageMovimientos');
  let panel = null;

  return {
    render() {
      if (!panel) {
        panel = renderMovementsPanel(container, { movementUseCases, cashUseCases, onChanged });
      } else {
        panel.render();
      }
    },
  };
}
