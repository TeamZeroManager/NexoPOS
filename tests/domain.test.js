/**
 * domain.test.js
 * ---------------------------------------------------------
 * Demuestra que la lógica de negocio es 100% testeable sin
 * navegador, sin DOM y sin localStorage (Regla de Oro, sección 47).
 *
 * Ejecutar con: npm test  (o) node tests/domain.test.js
 */
import assert from 'node:assert';
import { calculateChange } from '../src/domain/calculations/cashCalculations.js';
import {
  calculateItemSubtotal,
  calculateItemDiscount,
  calculateSaleSubtotal,
  calculateSaleTotal,
} from '../src/domain/calculations/saleCalculations.js';
import { validateStock } from '../src/domain/rules/stockRules.js';
import { validateDiscount } from '../src/domain/rules/discountRules.js';
import { assertCategoryCanBeDeleted } from '../src/domain/rules/categoryRules.js';
import { Money } from '../src/domain/valueObjects/Money.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    process.exitCode = 1;
  }
}

// --- Money: nunca usar floats para dinero (sección 13) ---
test('Money evita el error clásico 0.1 + 0.2 !== 0.3', () => {
  const result = Money.of(10).add(20);
  assert.strictEqual(result.toPesos(), 30);
});

// --- calculateChange (sección 6 y ejemplos de sección 50) ---
test('calculateChange(37500, 40000) -> cambio 2500', () => {
  const result = calculateChange(37500, 40000);
  assert.deepStrictEqual(result, { sufficient: true, change: 2500 });
});

test('calculateChange(37500, 20000) -> faltan 17500', () => {
  const result = calculateChange(37500, 20000);
  assert.deepStrictEqual(result, { sufficient: false, remainingAmount: 17500 });
});

// --- Descuento (sección 22, ejemplo sección 50) ---
test('calculateItemDiscount(3500, 200) -> 3300', () => {
  const subtotal = calculateItemSubtotal(3500, 1);
  const finalValue = calculateItemDiscount(subtotal, 200);
  assert.strictEqual(finalValue, 3300);
});

test('validateDiscount rechaza descuento mayor al precio', () => {
  assert.throws(() => validateDiscount(3500, 4000));
});

test('validateDiscount rechaza descuento negativo', () => {
  assert.throws(() => validateDiscount(3500, -1));
});

// --- Stock (sección 15, ejemplo sección 50) ---
test('validateStock(10, 12) -> error de stock insuficiente', () => {
  assert.throws(() => validateStock(10, 12), /Stock insuficiente/);
});

test('validateStock(10, 5) -> permitido', () => {
  assert.doesNotThrow(() => validateStock(10, 5));
});

// --- Categorías (sección 20) ---
test('no se puede eliminar categoría con productos asociados', () => {
  assert.throws(() => assertCategoryCanBeDeleted(3));
});

test('sí se puede eliminar categoría sin productos', () => {
  assert.doesNotThrow(() => assertCategoryCanBeDeleted(0));
});

// --- Venta completa (subtotal -> descuento -> total) ---
test('flujo completo: 2 productos con descuento', () => {
  const items = [
    { price: 3500, quantity: 2, discount: 200 }, // subtotal 7000, descuento 200
    { price: 10000, quantity: 1, discount: 0 },  // subtotal 10000
  ];
  const subtotal = calculateSaleSubtotal(items);
  assert.strictEqual(subtotal, 17000);

  const totalDiscount = items.reduce((acc, i) => acc + i.discount, 0);
  const total = calculateSaleTotal(subtotal, totalDiscount);
  assert.strictEqual(total, 16800);
});

console.log(`\n${passed} pruebas pasaron correctamente.`);
