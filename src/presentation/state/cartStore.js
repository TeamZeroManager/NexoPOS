import {
  calculateItemSubtotal,
  calculateSaleSubtotal,
  calculateSaleDiscount,
  calculateSaleTotal,
} from '../../domain/calculations/saleCalculations.js';
import { validateStock } from '../../domain/rules/stockRules.js';
import { validateDiscount } from '../../domain/rules/discountRules.js';

/**
 * createCartStore
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Mantener el carrito en memoria (no persiste hasta que se
 *   pone "en espera" o se completa la venta — eso es Fase 5/6).
 *   Todo el cálculo de dinero pasa por el dominio de la Fase 1;
 *   este módulo solo mantiene la lista de líneas y notifica a
 *   quien esté suscrito (la UI) cuando algo cambia.
 *
 * Reglas importantes (sección 15 y 22):
 *   - Agregar al carrito NO descuenta stock real, solo valida
 *     que haya suficiente para la cantidad que se está pidiendo.
 *   - No se permite un descuento mayor al subtotal de la línea.
 */
export function createCartStore() {
  let items = []; // { productId, name, price, quantity, discount, stock }
  let customer = { id: null, name: 'Mostrador' };
  let listeners = [];

  function notify() {
    const state = getState();
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.push(fn);
    fn(getState());
    return () => {
      listeners = listeners.filter((listener) => listener !== fn);
    };
  }

  function getState() {
    const subtotal = items.length ? calculateSaleSubtotal(items) : 0;
    const discount = items.length ? calculateSaleDiscount(items) : 0;
    const total = items.length ? calculateSaleTotal(subtotal, discount) : 0;
    return { items: items.map((i) => ({ ...i })), subtotal, discount, total, customer: { ...customer } };
  }

  /** Asigna un cliente al carrito activo (sección 24: venta fiada requiere cliente). */
  function setCustomer(id, name) {
    customer = { id, name };
    notify();
  }

  function clearCustomer() {
    customer = { id: null, name: 'Mostrador' };
    notify();
  }

  function addItem(product, quantity = 1) {
    const existing = items.find((i) => i.productId === product.id);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    validateStock(product.stock, nextQuantity); // lanza ValidationError si no alcanza

    if (existing) {
      existing.quantity = nextQuantity;
    } else {
      items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        discount: 0,
        stock: product.stock,
      });
    }
    notify();
  }

  function setQuantity(productId, quantity) {
    const item = items.find((i) => i.productId === productId);
    if (!item) return;
    if (quantity <= 0) return removeItem(productId);
    validateStock(item.stock, quantity);
    item.quantity = quantity;
    notify();
  }

  function setDiscount(productId, discount) {
    const item = items.find((i) => i.productId === productId);
    if (!item) return;
    const itemSubtotal = calculateItemSubtotal(item.price, item.quantity);
    validateDiscount(itemSubtotal, discount);
    item.discount = discount;
    notify();
  }

  function removeItem(productId) {
    items = items.filter((i) => i.productId !== productId);
    notify();
  }

  function clear() {
    items = [];
    customer = { id: null, name: 'Mostrador' };
    notify();
  }

  /** Reemplaza el carrito completo (usado al retomar una venta en espera). */
  function loadItems(newItems) {
    items = newItems.map((i) => ({ ...i }));
    notify();
  }

  function isEmpty() {
    return items.length === 0;
  }

  return {
    subscribe,
    getState,
    addItem,
    setQuantity,
    setDiscount,
    removeItem,
    clear,
    loadItems,
    isEmpty,
    setCustomer,
    clearCustomer,
  };
}
