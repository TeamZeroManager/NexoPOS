/**
 * generateId
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Generar identificadores únicos (UUID v4) para todas las
 *   entidades del sistema. Nunca se debe usar el índice de un
 *   array como identidad de una entidad (products[0]), porque
 *   eso rompe al sincronizar, migrar a base de datos o soportar
 *   múltiples dispositivos/sucursales.
 *
 * Salidas:
 *   string - UUID v4, ej: "3f2a9c1e-8b4d-4a2f-9c3e-1a2b3c4d5e6f"
 *
 * Dependencias:
 *   crypto.randomUUID (disponible en navegadores modernos y Node 16+)
 *   con fallback manual por si el entorno no lo soporta.
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback (no criptográficamente robusto, solo para entornos antiguos)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
