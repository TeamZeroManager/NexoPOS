import { Money } from '../valueObjects/Money.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * calculateChange
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Determinar si un pago en efectivo es suficiente y calcular
 *   el cambio o el monto faltante (sección 6 y 27 del spec).
 *
 * Entradas:
 *   total (int, pesos), received (int, pesos)
 *
 * Salidas:
 *   { sufficient: true,  change: number }
 *   { sufficient: false, remainingAmount: number }
 *
 * Ejemplos (ver sección 50):
 *   calculateChange(37500, 40000) -> { sufficient: true, change: 2500 }
 *   calculateChange(37500, 20000) -> { sufficient: false, remainingAmount: 17500 }
 */
export function calculateChange(total, received) {
  if (!Number.isInteger(total) || total < 0) {
    throw new ValidationError('El total debe ser un entero >= 0', 'total');
  }
  if (!Number.isInteger(received) || received < 0) {
    throw new ValidationError('El monto recibido debe ser un entero >= 0', 'received');
  }

  const totalMoney = Money.of(total);
  const receivedMoney = Money.of(received);

  if (receivedMoney.isGreaterOrEqualTo(totalMoney)) {
    return { sufficient: true, change: receivedMoney.subtract(totalMoney).toPesos() };
  }
  return { sufficient: false, remainingAmount: totalMoney.subtract(receivedMoney).toPesos() };
}
