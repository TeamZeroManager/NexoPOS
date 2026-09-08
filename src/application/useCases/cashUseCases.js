import { openCashRegister, closeCashRegister } from '../../domain/entities/CashRegister.js';
import { calculateExpectedCashBalance, calculateCashDifference } from '../../domain/calculations/cashRegisterCalculations.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * cashUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Orquestar apertura/cierre de caja y calcular su estado actual
 *   (sección 32): saldo inicial, ventas en efectivo, egresos,
 *   saldo esperado, efectivo contado, diferencia.
 *
 * Dependencias:
 *   cashRepository (aperturas/cierres), movementRepository
 *   (para sumar ingresos/egresos en efectivo desde la apertura).
 */
export function makeCashUseCases({ cashRepository, movementRepository }) {
  async function computeTotals(openedAt) {
    const movements = await movementRepository.findByDateRange(openedAt, null);
    const cashMovements = movements.filter((m) => m.affectsCash);
    const cashIncome = cashMovements.filter((m) => m.type === 'INCOME').reduce((acc, m) => acc + m.amount, 0);
    const cashExpense = cashMovements.filter((m) => m.type === 'EXPENSE').reduce((acc, m) => acc + m.amount, 0);
    return { cashIncome, cashExpense };
  }

  return {
    async getCurrentRegister() {
      return cashRepository.getCurrent();
    },

    async openRegister(openingAmount) {
      const current = await cashRepository.getCurrent();
      if (current) {
        throw new ValidationError('Ya hay una caja abierta', 'status');
      }
      const cashRegister = openCashRegister({ openingAmount });
      return cashRepository.save(cashRegister);
    },

    /** Estado en vivo de la caja abierta (o null si no hay ninguna). */
    async getCashStatus() {
      const current = await cashRepository.getCurrent();
      if (!current) return null;

      const { cashIncome, cashExpense } = await computeTotals(current.openedAt);
      const expectedBalance = calculateExpectedCashBalance(current.openingAmount, cashIncome, cashExpense);

      return { ...current, cashIncome, cashExpense, expectedBalance };
    },

    async closeRegister(countedCash) {
      const current = await cashRepository.getCurrent();
      if (!current) {
        throw new ValidationError('No hay ninguna caja abierta', 'status');
      }

      const { cashIncome, cashExpense } = await computeTotals(current.openedAt);
      const expectedBalance = calculateExpectedCashBalance(current.openingAmount, cashIncome, cashExpense);
      const difference = calculateCashDifference(countedCash, expectedBalance);

      const closed = closeCashRegister(current);
      await cashRepository.update(current.id, { status: 'CLOSED', closedAt: closed.closedAt, cashBalance: countedCash });

      return { ...closed, cashBalance: countedCash, expectedBalance, difference };
    },
  };
}
