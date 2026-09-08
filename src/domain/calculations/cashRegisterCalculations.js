import { Money } from '../valueObjects/Money.js';

/**
 * cashRegisterCalculations.js
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Calcular el saldo esperado de caja y la diferencia contra lo
 *   contado físicamente (sección 32). No sabe de dónde vienen los
 *   movimientos (localStorage, API, etc.), solo suma y resta.
 *
 * saldoEsperado = aperturaInicial + ingresosEnEfectivo - egresosEnEfectivo
 * diferencia    = efectivoContado - saldoEsperado
 *   diferencia > 0 → sobrante · diferencia < 0 → faltante
 */
export function calculateExpectedCashBalance(openingAmount, cashIncome, cashExpense) {
  return Money.of(openingAmount).add(cashIncome).subtract(cashExpense).toPesos();
}

export function calculateCashDifference(countedCash, expectedBalance) {
  return Money.of(countedCash).subtract(expectedBalance).toPesos();
}
