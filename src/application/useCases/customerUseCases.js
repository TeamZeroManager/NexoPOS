import { createCustomer } from '../../domain/entities/Customer.js';
import { createMovement } from '../../domain/entities/Movement.js';
import { assertValidPayment } from '../../domain/rules/creditRules.js';

/**
 * customerUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   CRUD de clientes y registro de abonos a la deuda (sección 24:
 *   "consultar deuda, historial, registrar abono, crear nueva
 *   venta fiada"). La creación de la venta fiada en sí vive en
 *   saleUseCases.registerCreditSale — aquí solo se maneja el
 *   cliente y su saldo.
 *
 *   Un abono se asume en efectivo (es la forma habitual de pagar
 *   un fiado en el mostrador) y por lo tanto SÍ afecta el saldo
 *   físico de caja — se registra como ingreso en Movimientos.
 */
export function makeCustomerUseCases({ customerRepository, saleRepository, movementRepository }) {
  return {
    async listCustomers() {
      return customerRepository.findAll();
    },

    async createCustomer({ name, phone, email, creditLimit }) {
      const customer = createCustomer({ name, phone, email, creditLimit });
      return customerRepository.save(customer);
    },

    async registerPayment(customerId, amount) {
      if (customerRepository.registerPaymentTransactional) {
        return customerRepository.registerPaymentTransactional(customerId, amount);
      }

      const customer = await customerRepository.findById(customerId);
      if (!customer) throw new Error('Cliente no encontrado');
      assertValidPayment(customer.currentDebt, amount); // lanza ValidationError si no es válido

      const updated = await customerRepository.update(customerId, { currentDebt: customer.currentDebt - amount });

      await movementRepository.save(
        createMovement({
          type: 'INCOME',
          concept: `Abono de ${customer.name}`,
          amount,
          affectsCash: true,
          referenceId: customerId,
        })
      );

      return updated;
    },

    /** Historial de ventas fiadas del cliente (sección 24: "historial"). */
    async getCustomerHistory(customerId) {
      const sales = await saleRepository.findByCustomer(customerId);
      return sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
  };
}
