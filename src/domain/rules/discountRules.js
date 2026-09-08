import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * validateDiscount
 * ---------------------------------------------------------
 * Sección 22: nunca permitir descuento negativo ni superior
 * al valor correspondiente.
 *
 * Ejemplo (sección 50): calculateDiscount(3500, 200) -> 3300
 * (el valor final lo calcula saleCalculations; esta regla solo guarda la entrada)
 */
export function validateDiscount(price, discount) {
  if (!Number.isInteger(discount) || discount < 0) {
    throw new ValidationError('El descuento no puede ser negativo', 'discount');
  }
  if (discount > price) {
    throw new ValidationError('El descuento no puede superar el precio', 'discount');
  }
  return true;
}
