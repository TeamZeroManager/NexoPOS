import { ValidationError } from '../../shared/errors/ValidationError.js';

/** Existencias, resumen valorizado y ajustes con motivo obligatorio (trazables en movimientos_inventario). */
export function makeInventoryUseCases({ productRepository, inventoryRepository }) {
  const status = (p) => (p.stock <= 0 ? 'OUT' : p.stock <= (p.minStock ?? 5) ? 'LOW' : 'OK');
  return {
    status,
    async listStock() {
      return (await productRepository.findAll()).map((p) => ({ ...p, stockStatus: status(p) }));
    },
    summarize(products) {
      const active = products.filter((p) => p.active);
      return {
        units: active.reduce((a, p) => a + p.stock, 0),
        costValue: active.reduce((a, p) => a + p.stock * (p.cost ?? 0), 0),
        saleValue: active.reduce((a, p) => a + p.stock * p.price, 0),
        low: active.filter((p) => p.stockStatus === 'LOW').length,
        out: active.filter((p) => p.stockStatus === 'OUT').length,
      };
    },
    async adjustStock({ productId, newStock, reason, minStock = null }) {
      if (!productId) throw new ValidationError('Selecciona un producto', 'productId');
      if (!Number.isInteger(newStock) || newStock < 0) throw new ValidationError('El stock debe ser un entero mayor o igual a 0', 'newStock');
      if (minStock !== null && (!Number.isInteger(minStock) || minStock < 0)) throw new ValidationError('El stock mínimo debe ser un entero mayor o igual a 0', 'minStock');
      if (!reason || reason.trim().length < 3) throw new ValidationError('Indica el motivo del ajuste (mínimo 3 caracteres)', 'reason');
      return inventoryRepository.adjust({ productId, newStock, reason: reason.trim(), minStock });
    },
    async listMovements(options) {
      return inventoryRepository.findMovements(options);
    },
  };
}
