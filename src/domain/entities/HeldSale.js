import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * HeldSale (Entidad)
 * ---------------------------------------------------------
 * Responsabilidad: representar un carrito guardado temporalmente
 * (ej: "Mesa 1", "Juan", "Pedido domicilio") para retomarlo después.
 */
export function createHeldSale({ name, items }) {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('La venta en espera requiere un nombre', 'name');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('La venta en espera requiere al menos un producto', 'items');
  }
  return Object.freeze({
    id: generateId(),
    name,
    items,
    createdAt: nowIso(),
  });
}
