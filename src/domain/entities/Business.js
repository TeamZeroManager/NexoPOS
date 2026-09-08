import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * Business (Entidad — Tenancy)
 * ---------------------------------------------------------
 * Responsabilidad: representar el negocio dueño de todos los
 * datos del sistema (sección 0 del setup inicial). Hoy solo existe
 * un negocio por instalación de localStorage; el campo businessId
 * en el resto de entidades deja preparado el terreno para cuando
 * un mismo backend sirva a varios negocios (multi-tenant real).
 */
export function createBusiness({ name, nit = null }) {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('El negocio requiere un nombre válido', 'name');
  }
  return Object.freeze({
    id: generateId(),
    name,
    nit,
    createdAt: nowIso(),
  });
}
