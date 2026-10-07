import { ValidationError } from '../../shared/errors/ValidationError.js';

/** Órdenes de compra: validan y normalizan; el efecto en stock/caja ocurre atómico en la base (RPC). */
export function makePurchaseUseCases({ purchaseRepository }) {
  /** Une líneas repetidas del mismo producto y valida enteros. */
  function normalizeItems(items) {
    if (!items || items.length === 0) throw new ValidationError('La orden requiere al menos un producto', 'items');
    const merged = new Map();
    for (const i of items) {
      if (!i.productId) throw new ValidationError('Producto inválido en la orden', 'items');
      if (!Number.isInteger(i.quantity) || i.quantity <= 0) throw new ValidationError('La cantidad debe ser un entero mayor a 0', 'quantity');
      if (!Number.isInteger(i.unitCost) || i.unitCost < 0) throw new ValidationError('El costo debe ser un entero mayor o igual a 0', 'unitCost');
      const prev = merged.get(i.productId);
      if (prev && prev.unitCost !== i.unitCost) throw new ValidationError(`"${i.name ?? 'Producto'}" está repetido con costos distintos`, 'items');
      merged.set(i.productId, prev ? { ...prev, quantity: prev.quantity + i.quantity } : { ...i });
    }
    return [...merged.values()];
  }
  return {
    normalizeItems,
    total: (items) => items.reduce((a, i) => a + i.quantity * i.unitCost, 0),
    list: () => purchaseRepository.findAll(),
    async create({ supplierId, items, notes }) {
      if (!supplierId) throw new ValidationError('Selecciona un proveedor', 'supplierId');
      return purchaseRepository.create({ supplierId, items: normalizeItems(items), notes: notes?.trim() || null });
    },
    receive: (orderId, { payFromCash = false } = {}) => purchaseRepository.receive(orderId, { payFromCash }),
    cancel: (orderId) => purchaseRepository.cancel(orderId),
  };
}
