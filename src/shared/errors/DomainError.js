/**
 * DomainError
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Error base para todas las violaciones de reglas de negocio.
 *   Permite distinguir errores de dominio de errores técnicos
 *   (red, storage, etc.) en cualquier capa superior (UI, API).
 *
 * Reglas importantes:
 *   - La capa de presentación decide CÓMO mostrar el error
 *     (Toast, Modal, JSON de API), pero el dominio decide
 *     CUÁNDO ocurre el error.
 */
export class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
