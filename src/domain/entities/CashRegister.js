import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * CashRegister (Entidad)
 * ---------------------------------------------------------
 * Responsabilidad: representar la apertura/cierre de una caja.
 * status: 'OPEN' | 'CLOSED'.
 */
export function openCashRegister({ openingAmount }) {
  if (!Number.isInteger(openingAmount) || openingAmount < 0) {
    throw new ValidationError('El monto de apertura debe ser un entero >= 0', 'openingAmount');
  }
  return Object.freeze({
    id: generateId(),
    openingAmount,
    cashBalance: openingAmount,
    status: 'OPEN',
    openedAt: nowIso(),
    closedAt: null,
  });
}

export function closeCashRegister(cashRegister) {
  if (cashRegister.status !== 'OPEN') {
    throw new ValidationError('Solo se puede cerrar una caja abierta', 'status');
  }
  return Object.freeze({
    ...cashRegister,
    status: 'CLOSED',
    closedAt: nowIso(),
  });
}
