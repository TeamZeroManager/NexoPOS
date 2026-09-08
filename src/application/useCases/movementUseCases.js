import { createMovement } from '../../domain/entities/Movement.js';

/**
 * movementUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Registrar ingresos/egresos y calcular el resumen del período
 *   (sección 30: "Ingresos y egresos"; sección 31: "Gastos").
 *
 * Reglas importantes (sección 31):
 *   Si el gasto sale "de la caja" (fromCash=true) y no hay
 *   suficiente efectivo, NO se bloquea — solo se advierte desde
 *   la UI (este caso de uso siempre registra el movimiento, para
 *   no perder trazabilidad).
 */
export function makeMovementUseCases({ movementRepository }) {
  return {
    async registerIncome({ concept, amount, affectsCash, referenceId = null }) {
      const movement = createMovement({ type: 'INCOME', concept, amount, affectsCash, referenceId });
      return movementRepository.save(movement);
    },

    async registerExpense({ concept, amount, fromCash }) {
      const movement = createMovement({ type: 'EXPENSE', concept, amount, affectsCash: fromCash });
      return movementRepository.save(movement);
    },

    async listMovements({ from = null, to = null } = {}) {
      const movements = await movementRepository.findByDateRange(from, to);
      return movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async getSummary({ from = null, to = null } = {}) {
      const movements = await movementRepository.findByDateRange(from, to);
      const income = movements.filter((m) => m.type === 'INCOME').reduce((acc, m) => acc + m.amount, 0);
      const expense = movements.filter((m) => m.type === 'EXPENSE').reduce((acc, m) => acc + m.amount, 0);
      return { income, expense, balance: income - expense };
    },
  };
}
