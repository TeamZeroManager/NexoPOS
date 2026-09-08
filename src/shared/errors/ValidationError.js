import { DomainError } from './DomainError.js';

/**
 * ValidationError
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Señalar que una entrada no cumple las reglas de negocio
 *   (stock insuficiente, descuento inválido, pago insuficiente, etc.)
 *
 * Entradas:
 *   message (string) - descripción legible del problema
 *   field (string opcional) - campo relacionado (ej: 'stock')
 */
export class ValidationError extends DomainError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}
