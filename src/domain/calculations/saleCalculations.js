import { Money } from '../valueObjects/Money.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * saleCalculations.js
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Contener TODA la aritmética de una venta. Esta función podría
 *   ejecutarse mañana desde HTML/JS, React, una app móvil o el
 *   backend sin cambiar una sola línea (Regla de Oro, sección 47).
 *
 * No sabe:
 *   qué botón la llamó, cómo se muestra, ni si viene de HTML o API.
 */

/** subtotal = precio × cantidad (enteros en pesos) */
export function calculateItemSubtotal(price, quantity) {
  if (!Number.isInteger(price) || price < 0) {
    throw new ValidationError('El precio debe ser un entero >= 0', 'price');
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError('La cantidad debe ser un entero > 0', 'quantity');
  }
  return Money.of(price).multiply(quantity).toPesos();
}

/**
 * Total de una línea de carrito luego de aplicar su rebaja.
 * Nunca permite descuento negativo ni superior al subtotal (sección 22).
 */
export function calculateItemDiscount(itemSubtotal, discount = 0) {
  if (!Number.isInteger(discount) || discount < 0) {
    throw new ValidationError('El descuento no puede ser negativo', 'discount');
  }
  if (discount > itemSubtotal) {
    throw new ValidationError('El descuento no puede superar el valor del ítem', 'discount');
  }
  return Money.of(itemSubtotal).subtract(discount).toPesos();
}

/** Suma de subtotales de todas las líneas del carrito (antes de descuentos). */
export function calculateSaleSubtotal(items) {
  return items
    .reduce((acc, item) => acc.add(calculateItemSubtotal(item.price, item.quantity)), Money.zero())
    .toPesos();
}

/** Suma de todos los descuentos por línea. */
export function calculateSaleDiscount(items) {
  return items
    .reduce((acc, item) => acc.add(item.discount ?? 0), Money.zero())
    .toPesos();
}

/**
 * total = subtotal - descuentos. Nunca puede quedar negativo.
 */
export function calculateSaleTotal(subtotal, discount) {
  const total = Money.of(subtotal).subtract(discount);
  if (total.isNegative()) {
    throw new ValidationError('El total de la venta no puede ser negativo', 'total');
  }
  return total.toPesos();
}
