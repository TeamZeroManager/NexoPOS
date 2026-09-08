/**
 * Estados posibles de una venta. Nunca se "borra" una venta (sección 39/51),
 * se transiciona de estado para mantener trazabilidad.
 */
export const SALE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CREDIT: 'CREDIT',
  CANCELLED: 'CANCELLED',
});
