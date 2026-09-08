import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * Role (Entidad — RBAC)
 * ---------------------------------------------------------
 * Responsabilidad: representar un rol con un conjunto de permisos
 * (sección 34: Cajero/Administrador, ahora con permisos reales en
 * vez de simulados). `permissions` es un array de claves de
 * shared/constants/permissions.js.
 */
export function createRole({ name, permissions = [] }) {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('El rol requiere un nombre válido', 'name');
  }
  if (!Array.isArray(permissions)) {
    throw new ValidationError('Los permisos deben ser una lista', 'permissions');
  }
  return Object.freeze({
    id: generateId(),
    name,
    permissions: [...permissions],
    createdAt: nowIso(),
  });
}
