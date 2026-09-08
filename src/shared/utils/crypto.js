/**
 * crypto.js
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Convertir una contraseña en texto plano a un hash SHA-256
 *   antes de guardarla, para no dejarla legible en localStorage.
 *
 * ADVERTENCIA IMPORTANTE (spec sección 34):
 *   "No confiar en el frontend como mecanismo real de seguridad."
 *   Este hash NO reemplaza un backend de autenticación real: no
 *   tiene salt por usuario, corre en el navegador, y cualquiera con
 *   acceso a las herramientas de desarrollo puede leer localStorage.
 *   Cuando exista backend (Fase 5-6 del roadmap de arquitectura),
 *   esta función se reemplaza por autenticación real del servidor
 *   (bcrypt/argon2 + JWT o sesiones), sin cambiar cómo la UI llama
 *   a authUseCases.login().
 *
 * Dependencias:
 *   crypto.subtle (Web Crypto API, disponible en todo navegador
 *   moderno servido por HTTP/HTTPS — por eso este proyecto corre
 *   con `npm start` y no con file://).
 */
export async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
