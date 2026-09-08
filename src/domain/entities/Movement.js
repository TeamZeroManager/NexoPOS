import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * Movement (Entidad)
 * ---------------------------------------------------------
 * Responsabilidad: registrar cualquier movimiento de dinero
 * (ingreso por venta, egreso por gasto, abono de fiado, etc.)
 * de forma trazable. type: 'INCOME' | 'EXPENSE'.
 */
export function createMovement({ type, concept, amount, affectsCash, referenceId = null }) {
  if (!['INCOME', 'EXPENSE'].includes(type)) {
    throw new ValidationError('Tipo de movimiento inválido', 'type');
  }
  if (!concept || typeof concept !== 'string') {
    throw new ValidationError('El movimiento requiere un concepto', 'concept');
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError('El monto debe ser un entero mayor a 0', 'amount');
  }
  return Object.freeze({
    id: generateId(),
    type,
    concept,
    amount,
    affectsCash: Boolean(affectsCash),
    referenceId,
    createdAt: nowIso(),
  });
}
