import { generateId } from '../../shared/utils/id.js';
import { nowIso } from '../../shared/utils/format.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * StaffUser (Entidad — Auth)
 * ---------------------------------------------------------
 * Responsabilidad: representar un usuario del SISTEMA (cajero,
 * administrador), distinto de Customer (cliente/fiado). Guarda un
 * hash de la contraseña, nunca texto plano (ver shared/utils/crypto.js).
 *
 * Reglas importantes:
 *   - name, username y passwordHash son obligatorios.
 *   - La unicidad del username y la fortaleza de la contraseña se
 *     validan en el caso de uso (authRules.js), no aquí — esta
 *     función solo construye la entidad ya validada.
 */
export function createStaffUser({ name, username, passwordHash, roleId, active = true }) {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('El usuario requiere un nombre válido', 'name');
  }
  if (!username || typeof username !== 'string') {
    throw new ValidationError('El usuario requiere un nombre de usuario', 'username');
  }
  if (!passwordHash) {
    throw new ValidationError('El usuario requiere una contraseña', 'password');
  }
  if (!roleId) {
    throw new ValidationError('El usuario requiere un rol asignado', 'roleId');
  }
  return Object.freeze({
    id: generateId(),
    name,
    username: username.toLowerCase(),
    passwordHash,
    roleId,
    active,
    createdAt: nowIso(),
  });
}
