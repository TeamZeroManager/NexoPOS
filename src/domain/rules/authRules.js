import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * authRules.js
 * ---------------------------------------------------------
 * Responsabilidad: reglas de negocio de autenticación y usuarios
 * del sistema. No sabe de hashing ni de localStorage — recibe
 * datos ya resueltos (hash calculado, lista de usuarios existente).
 */

/** Contraseña: mínimo 8 caracteres. */
export const MIN_PASSWORD_LENGTH = 8;
export function assertPasswordStrength(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`La contraseña debe tener mínimo ${MIN_PASSWORD_LENGTH} caracteres`, 'password');
  }
  return true;
}

/** Usuario: 3-30 caracteres [a-z0-9._-] (mismo patrón que el CHECK de la base y la Edge Function). */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export function assertValidUsername(username) {
  if (!USERNAME_PATTERN.test((username ?? '').toLowerCase().trim())) {
    throw new ValidationError('El usuario debe tener 3-30 caracteres: letras, números, punto, guion o guion bajo', 'username');
  }
  return true;
}

/** No permitir dos usuarios con el mismo username (sin importar mayúsculas). */
export function assertUniqueUsername(existingUsers, username) {
  const normalized = username.toLowerCase();
  if (existingUsers.some((u) => u.username === normalized)) {
    throw new ValidationError('Ese nombre de usuario ya está en uso', 'username');
  }
  return true;
}

/**
 * Compara el hash calculado de la contraseña ingresada contra el
 * guardado. Mensaje de error genérico a propósito: no se debe
 * revelar si falló el usuario o la contraseña (buena práctica de
 * seguridad, aunque aquí la "seguridad" sea solo de interfaz).
 */
export function assertValidCredentials(user, computedHash) {
  if (!user || !user.active || user.passwordHash !== computedHash) {
    throw new ValidationError('Usuario o contraseña incorrectos', 'credentials');
  }
  return true;
}
