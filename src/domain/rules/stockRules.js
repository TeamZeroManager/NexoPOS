import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * validateStock
 * ---------------------------------------------------------
 * Responsabilidad: impedir vender más unidades de las disponibles.
 * Sección 15: agregar al carrito NO descuenta stock; solo se
 * descuenta al completar la venta (eso lo hace el caso de uso,
 * usando esta regla como guardia).
 *
 * Ejemplo (sección 50): validateStock(10, 12) -> error
 */
export function validateStock(availableStock, requestedQuantity) {
  if (requestedQuantity > availableStock) {
    throw new ValidationError(
      `Stock insuficiente: disponible ${availableStock}, solicitado ${requestedQuantity}`,
      'stock'
    );
  }
  return true;
}
