import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * Customer (Entidad)
 * ---------------------------------------------------------
 * Responsabilidad: representar un cliente que puede tener
 * ventas fiadas. creditLimit y currentDebt son enteros en pesos.
 */
export function createCustomer({ name, phone = null, email = null, creditLimit = 0 }) {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('El cliente requiere un nombre válido', 'name');
  }
  if (!Number.isInteger(creditLimit) || creditLimit < 0) {
    throw new ValidationError('El cupo de crédito debe ser un entero >= 0', 'creditLimit');
  }
  return Object.freeze({
    id: generateId(),
    name,
    phone,
    email,
    creditLimit,
    currentDebt: 0,
    active: true,
    createdAt: nowIso(),
  });
}
