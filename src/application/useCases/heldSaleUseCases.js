import { createHeldSale } from '../../domain/entities/HeldSale.js';

/**
 * heldSaleUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Guardar un carrito activo para retomarlo después (sección 23),
 *   sin perder los datos si el cliente aún no ha pagado.
 *
 * Reglas importantes:
 *   - "Retomar" saca la venta de la lista de espera (delete) y
 *     devuelve sus items para cargarlos de vuelta al carrito; no
 *     es una simple lectura, porque una venta en espera no puede
 *     estar activa dos veces a la vez.
 */
export function makeHeldSaleUseCases({ heldSaleRepository }) {
  return {
    async listHeldSales() {
      return heldSaleRepository.findAll();
    },

    async holdSale({ name, items }) {
      const heldSale = createHeldSale({ name, items });
      return heldSaleRepository.save(heldSale);
    },

    async resumeHeldSale(id) {
      const heldSale = await heldSaleRepository.findById(id);
      if (!heldSale) return null;
      await heldSaleRepository.delete(id);
      return heldSale;
    },

    async deleteHeldSale(id) {
      return heldSaleRepository.delete(id);
    },
  };
}
