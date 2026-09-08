/**
 * Métodos de pago soportados en el cobro directo (sección 25: solo
 * uno por venta). CREDIT no aparece en el selector de "Cobrar" — se
 * usa únicamente para registrar internamente una venta fiada
 * (sección 24), creada desde el flujo de Fiados.
 */
export const PAYMENT_METHODS = Object.freeze({
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
  CREDIT: 'CREDIT',
});
