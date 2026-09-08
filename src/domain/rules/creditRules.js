import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * assertCreditAvailable
 * ---------------------------------------------------------
 * Sección 24: al crear una venta fiada, la deuda actual + el
 * total de la nueva venta no puede superar el cupo de crédito
 * del cliente.
 */
export function assertCreditAvailable(customer, saleTotal) {
  const projectedDebt = customer.currentDebt + saleTotal;
  if (projectedDebt > customer.creditLimit) {
    throw new ValidationError(
      `Cupo de crédito insuficiente: cupo ${customer.creditLimit}, deuda proyectada ${projectedDebt}`,
      'creditLimit'
    );
  }
  return true;
}

/**
 * assertValidPayment
 * ---------------------------------------------------------
 * Sección 24 ("registrar abono"): el abono debe ser positivo y
 * no puede superar la deuda actual del cliente (no tiene sentido
 * un abono que deje la deuda en negativo).
 */
export function assertValidPayment(currentDebt, amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError('El abono debe ser un monto positivo', 'amount');
  }
  if (amount > currentDebt) {
    throw new ValidationError('El abono no puede ser mayor a la deuda actual', 'amount');
  }
  return true;
}
