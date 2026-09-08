/**
 * format.js
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Convertir valores internos (enteros en pesos, fechas ISO)
 *   a representaciones legibles para el usuario colombiano.
 *   Esta es la ÚNICA capa que debe saber "cómo se ve" el dinero
 *   o la fecha. El dominio nunca formatea, solo calcula.
 *
 * Entradas / Salidas:
 *   formatCurrency(3500)              -> "$3.500"
 *   formatDate("2026-09-05T13:30:00Z")-> "05/09/2026 08:30 a. m." (hora local)
 *
 * Dependencias:
 *   Intl.NumberFormat / Intl.DateTimeFormat (nativos del navegador/Node).
 */

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(pesos) {
  if (typeof pesos !== 'number' || Number.isNaN(pesos)) {
    throw new TypeError('formatCurrency: se esperaba un número entero de pesos');
  }
  return currencyFormatter.format(pesos);
}

export function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('formatDate: fecha ISO inválida');
  }
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

/** Fecha actual en formato ISO 8601, para persistir (createdAt/updatedAt). */
export function nowIso() {
  return new Date().toISOString();
}
