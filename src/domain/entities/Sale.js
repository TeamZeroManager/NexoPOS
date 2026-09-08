import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { SALE_STATUS } from '../../shared/constants/saleStatus.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * Sale (Entidad)
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Representar una venta ya calculada (los cálculos de subtotal,
 *   descuento, total y cambio se hacen ANTES en domain/calculations,
 *   esta entidad solo empaqueta el resultado final para persistir).
 *
 * Entradas:
 *   items: [{ productId, name, price, quantity, discount, subtotal }]
 *   customerId, paymentMethod, subtotal, discount, total, received, change
 *
 * Reglas importantes:
 *   - status inicia en PENDING; el caso de uso decide si pasa a
 *     COMPLETED o CREDIT según el método de pago.
 *   - No se debe mutar una venta ya creada; las anulaciones generan
 *     un nuevo movimiento/estado, no un borrado (sección 39).
 */
export function createSale({
  items,
  customerId = null,
  paymentMethod,
  subtotal,
  discount,
  total,
  received,
  change,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('La venta requiere al menos un producto', 'items');
  }
  if (!paymentMethod) {
    throw new ValidationError('La venta requiere un método de pago', 'paymentMethod');
  }

  return Object.freeze({
    id: generateId(),
    items,
    customerId,
    paymentMethod,
    subtotal,
    discount,
    total,
    received,
    change,
    status: SALE_STATUS.PENDING,
    createdAt: nowIso(),
  });
}
