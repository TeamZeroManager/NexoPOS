import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * Branch (Entidad)
 * ---------------------------------------------------------
 * Responsabilidad: representar una sucursal del negocio. Prepara
 * el terreno para múltiples sucursales (sección 37/46 V8), aunque
 * hoy el setup inicial solo crea una ("Sucursal principal").
 *
 * cashPointName es solo una etiqueta (ej. "Caja 1") para identificar
 * el punto de cobro; la apertura/cierre real de caja ya vive en
 * CashRegister (Fase 8) y no depende de este campo.
 */
export function createBranch({ name, businessId, cashPointName = null }) {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('La sucursal requiere un nombre válido', 'name');
  }
  if (!businessId) {
    throw new ValidationError('La sucursal requiere un negocio asociado', 'businessId');
  }
  return Object.freeze({
    id: generateId(),
    name,
    businessId,
    cashPointName,
    createdAt: nowIso(),
  });
}
