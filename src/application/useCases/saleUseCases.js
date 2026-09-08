import { createSale } from '../../domain/entities/Sale.js';
import { createMovement } from '../../domain/entities/Movement.js';
import { calculateChange } from '../../domain/calculations/cashCalculations.js';
import {
  calculateSaleSubtotal,
  calculateSaleDiscount,
  calculateSaleTotal,
} from '../../domain/calculations/saleCalculations.js';
import { validateStock } from '../../domain/rules/stockRules.js';
import { assertCreditAvailable } from '../../domain/rules/creditRules.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import { PAYMENT_METHODS } from '../../shared/constants/paymentMethods.js';
import { SALE_STATUS } from '../../shared/constants/saleStatus.js';

const METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Efectivo',
  [PAYMENT_METHODS.CARD]: 'Tarjeta',
  [PAYMENT_METHODS.TRANSFER]: 'Transferencia',
};

/**
 * saleUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Orquestar el cobro de una venta (sección 16, "Transacciones"):
 *     1. calcular subtotal/descuento/total desde el carrito
 *     2. validar el pago (efectivo: calculateChange; fiado: cupo
 *        de crédito; otros: monto exacto)
 *     3. re-validar stock (pudo cambiar desde que se armó el carrito)
 *     4. descontar inventario
 *     5. crear y persistir la venta como COMPLETED (o CREDIT)
 *     6. registrar el ingreso en Movimientos (sección 30) — solo
 *        las ventas en Efectivo afectan el saldo físico de caja;
 *        las fiadas no generan ingreso hasta que se abona (ver
 *        customerUseCases.registerPayment)
 *
 *   En la versión LocalStorage estos pasos se simulan en secuencia;
 *   el día que exista backend con base de datos real, esto se
 *   ejecutará dentro de una transacción — la forma de llamar a este
 *   caso de uso desde la UI no cambia.
 *
 * Dependencias:
 *   productRepository (para revalidar/descontar stock),
 *   saleRepository (para persistir la venta),
 *   customerRepository (solo para registerCreditSale),
 *   movementRepository (para registrar el ingreso en Caja)
 */
export function makeSaleUseCases({ productRepository, saleRepository, customerRepository, movementRepository }) {
  async function revalidateAndDiscountStock(items) {
    // Re-validar stock: pudo cambiar desde que se armó el carrito.
    for (const item of items) {
      const product = await productRepository.findById(item.productId);
      if (!product) {
        throw new ValidationError(`El producto "${item.name}" ya no existe`, 'items');
      }
      validateStock(product.stock, item.quantity);
    }
    // Descontar inventario (sección 15: solo al completar la venta).
    for (const item of items) {
      const product = await productRepository.findById(item.productId);
      await productRepository.update(item.productId, { stock: product.stock - item.quantity });
    }
  }

  return {
    /** Todas las ventas registradas, sin filtro — usado por Resumen (sección 40). */
    async listAllSales() {
      return saleRepository.findAll();
    },

    async completeSale({ items, paymentMethod, customerId = null, received }) {
      if (!items || items.length === 0) {
        throw new ValidationError('No hay productos en el carrito', 'items');
      }

      const subtotal = calculateSaleSubtotal(items);
      const discount = calculateSaleDiscount(items);
      const total = calculateSaleTotal(subtotal, discount);

      let finalReceived = received;
      let change = 0;

      if (paymentMethod === PAYMENT_METHODS.CASH) {
        const result = calculateChange(total, received);
        if (!result.sufficient) {
          throw new ValidationError(`Faltan $${result.remainingAmount.toLocaleString('es-CO')}`, 'received');
        }
        change = result.change;
      } else {
        // Tarjeta / Transferencia: se asume el monto exacto del total.
        finalReceived = total;
        change = 0;
      }

      await revalidateAndDiscountStock(items);

      const sale = createSale({
        items,
        customerId,
        paymentMethod,
        subtotal,
        discount,
        total,
        received: finalReceived,
        change,
      });

      await saleRepository.save(sale);
      await saleRepository.updateStatus(sale.id, SALE_STATUS.COMPLETED);

      await movementRepository.save(
        createMovement({
          type: 'INCOME',
          concept: `Venta ${METHOD_LABELS[paymentMethod]}`,
          amount: total,
          affectsCash: paymentMethod === PAYMENT_METHODS.CASH,
          referenceId: sale.id,
        })
      );

      return { ...sale, status: SALE_STATUS.COMPLETED };
    },

    /**
     * registerCreditSale (sección 24)
     * ---------------------------------------------------------
     * "Cuando se registra una venta fiada: inventario disminuye,
     * venta queda registrada, deuda aumenta."
     */
    async registerCreditSale({ items, customerId }) {
      if (!items || items.length === 0) {
        throw new ValidationError('No hay productos en el carrito', 'items');
      }
      if (!customerId) {
        throw new ValidationError('Selecciona un cliente para fiar la venta', 'customerId');
      }

      const customer = await customerRepository.findById(customerId);
      if (!customer) {
        throw new ValidationError('Cliente no encontrado', 'customerId');
      }

      const subtotal = calculateSaleSubtotal(items);
      const discount = calculateSaleDiscount(items);
      const total = calculateSaleTotal(subtotal, discount);

      assertCreditAvailable(customer, total); // lanza ValidationError si excede el cupo

      await revalidateAndDiscountStock(items);

      const sale = createSale({
        items,
        customerId,
        paymentMethod: PAYMENT_METHODS.CREDIT,
        subtotal,
        discount,
        total,
        received: 0,
        change: 0,
      });

      await saleRepository.save(sale);
      await saleRepository.updateStatus(sale.id, SALE_STATUS.CREDIT);
      await customerRepository.update(customerId, { currentDebt: customer.currentDebt + total });

      return { ...sale, status: SALE_STATUS.CREDIT };
    },
  };
}
