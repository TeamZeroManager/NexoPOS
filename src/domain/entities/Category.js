import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * Category (Entidad)
 * ---------------------------------------------------------
 * Responsabilidad: agrupar productos. La regla "no se puede
 * eliminar una categoría con productos asociados" vive en
 * domain/rules/categoryRules.js, no aquí (esta entidad solo
 * modela datos, no decide flujos).
 */
export function createCategory({ name }) {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('La categoría requiere un nombre válido', 'name');
  }
  const timestamp = nowIso();
  return Object.freeze({
    id: generateId(),
    name,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
