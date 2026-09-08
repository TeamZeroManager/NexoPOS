import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * Product (Entidad)
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Representar un producto vendible, con su precio (entero en
 *   pesos) y su stock. No sabe nada de HTML, tarjetas ni grillas.
 *
 * Entradas (createProduct):
 *   { name, price, categoryId, stock, sku?, image? }
 *
 * Salidas:
 *   Objeto Product congelado, con id, timestamps y active=true.
 *
 * Reglas importantes:
 *   - price y stock deben ser enteros >= 0.
 *   - name y categoryId son obligatorios.
 */
export function createProduct({ name, price, categoryId, stock, sku = null, image = null }) {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('El producto requiere un nombre válido', 'name');
  }
  if (!Number.isInteger(price) || price < 0) {
    throw new ValidationError('El precio debe ser un entero mayor o igual a 0', 'price');
  }
  if (!categoryId) {
    throw new ValidationError('El producto requiere una categoría', 'categoryId');
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new ValidationError('El stock debe ser un entero mayor o igual a 0', 'stock');
  }

  const timestamp = nowIso();

  return Object.freeze({
    id: generateId(),
    name,
    price,
    categoryId,
    stock,
    sku,
    image,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
