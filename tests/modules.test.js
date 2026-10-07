import assert from 'node:assert/strict';
import { makeInventoryUseCases } from '../src/application/useCases/inventoryUseCases.js';
import { makeSupplierUseCases } from '../src/application/useCases/supplierUseCases.js';
import { makePurchaseUseCases } from '../src/application/useCases/purchaseUseCases.js';
import { makeReportUseCases } from '../src/application/useCases/reportUseCases.js';
import { makeAuditUseCases } from '../src/application/useCases/auditUseCases.js';
import { makeBusinessUseCases } from '../src/application/useCases/businessUseCases.js';
import { darken, readableInk, applyBrand } from '../src/shared/utils/theme.js';

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log(`✅ ${name}`);
}
const rejects = (promiseOrFn, re) => assert.rejects(typeof promiseOrFn === 'function' ? promiseOrFn : () => promiseOrFn, re);

// ---------- Inventario ----------
const products = [
  { id: 'a', name: 'A', price: 1000, cost: 600, stock: 10, minStock: 5, active: true },
  { id: 'b', name: 'B', price: 2000, cost: 0, stock: 3, minStock: 5, active: true },
  { id: 'c', name: 'C', price: 500, cost: 100, stock: 0, minStock: 2, active: true },
  { id: 'd', name: 'D', price: 900, cost: 100, stock: 50, minStock: 5, active: false },
];
const adjustCalls = [];
const inv = makeInventoryUseCases({
  productRepository: { findAll: async () => products },
  inventoryRepository: { adjust: async (x) => adjustCalls.push(x), findMovements: async () => [] },
});

await test('inventario: estado OK / LOW / OUT según stock mínimo', async () => {
  const list = await inv.listStock();
  assert.deepEqual(list.map((p) => p.stockStatus), ['OK', 'LOW', 'OUT', 'OK']);
});
await test('inventario: resumen valorizado ignora productos inactivos', async () => {
  const s = inv.summarize(await inv.listStock());
  assert.equal(s.units, 13);
  assert.equal(s.costValue, 10 * 600);
  assert.equal(s.saleValue, 10 * 1000 + 3 * 2000);
  assert.deepEqual([s.low, s.out], [1, 1]);
});
await test('inventario: ajuste exige motivo, entero >= 0 y producto', async () => {
  await rejects(inv.adjustStock({ productId: 'a', newStock: 5, reason: ' ' }), /motivo/i);
  await rejects(inv.adjustStock({ productId: 'a', newStock: -1, reason: 'conteo' }), /stock/i);
  await rejects(inv.adjustStock({ productId: 'a', newStock: 2.5, reason: 'conteo' }), /entero/i);
  await rejects(inv.adjustStock({ productId: '', newStock: 1, reason: 'conteo' }), /producto/i);
  assert.equal(adjustCalls.length, 0);
});
await test('inventario: ajuste válido llega al repositorio con motivo recortado', async () => {
  await inv.adjustStock({ productId: 'a', newStock: 8, reason: '  conteo físico ', minStock: 4 });
  assert.deepEqual(adjustCalls[0], { productId: 'a', newStock: 8, reason: 'conteo físico', minStock: 4 });
});

// ---------- Proveedores ----------
const saved = [];
const sup = makeSupplierUseCases({ supplierRepository: { findAll: async () => [], save: async (s) => (saved.push(s), s), update: async (id, c) => ({ id, ...c }) } });
await test('proveedores: nombre obligatorio y correo válido', async () => {
  await rejects(() => sup.create({ name: '  ' }), /nombre/i);
  await rejects(() => sup.create({ name: 'X', email: 'no-es-correo' }), /correo/i);
});
await test('proveedores: crea activo, recorta, vacíos a null y no envía campos ausentes', async () => {
  await sup.create({ name: ' Distri SAS ', nit: '', phone: ' 300 ', email: '' });
  assert.deepEqual(saved[0], { name: 'Distri SAS', nit: null, phone: '300', email: null, active: true });
});

// ---------- Compras ----------
const purchaseCalls = [];
const pur = makePurchaseUseCases({ purchaseRepository: {
  findAll: async () => [], create: async (x) => purchaseCalls.push(['create', x]),
  receive: async (id, o) => purchaseCalls.push(['receive', id, o]), cancel: async () => {},
} });
await test('compras: une líneas repetidas del mismo producto y costo', () => {
  const items = pur.normalizeItems([{ productId: 'a', name: 'A', quantity: 2, unitCost: 500 }, { productId: 'a', name: 'A', quantity: 3, unitCost: 500 }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 5);
  assert.equal(pur.total(items), 2500);
});
await test('compras: rechaza cantidad <= 0, costo negativo, vacío y costos distintos', () => {
  assert.throws(() => pur.normalizeItems([]), /al menos un producto/);
  assert.throws(() => pur.normalizeItems([{ productId: 'a', quantity: 0, unitCost: 1 }]), /cantidad/i);
  assert.throws(() => pur.normalizeItems([{ productId: 'a', quantity: 1, unitCost: -1 }]), /costo/i);
  assert.throws(() => pur.normalizeItems([{ productId: 'a', name: 'A', quantity: 1, unitCost: 1 }, { productId: 'a', name: 'A', quantity: 1, unitCost: 2 }]), /costos distintos/);
});
await test('compras: crear exige proveedor; recibir propaga el medio de pago', async () => {
  await rejects(pur.create({ supplierId: '', items: [{ productId: 'a', quantity: 1, unitCost: 1 }] }), /proveedor/i);
  await pur.create({ supplierId: 's1', items: [{ productId: 'a', quantity: 1, unitCost: 1 }], notes: '  ' });
  assert.equal(purchaseCalls[0][1].notes, null);
  await pur.receive('o1', { payFromCash: true });
  assert.deepEqual(purchaseCalls[1], ['receive', 'o1', { payFromCash: true }]);
});

// ---------- Reportes ----------
let lastRange = null;
const rep = makeReportUseCases({ reportRepository: { salesReport: async (r) => (lastRange = r) } });
await test('reportes: rango inclusivo [desde 00:00, hasta+1 00:00)', async () => {
  await rep.getSalesReport({ from: '2026-09-01', to: '2026-09-01' });
  const h = (new Date(lastRange.toIso) - new Date(lastRange.fromIso)) / 3600000;
  assert.ok(h >= 23 && h <= 25, `se esperaba ~24h, fue ${h}h`);
});
await test('reportes: rechaza fecha inválida, rango invertido y > 1 año', async () => {
  await rejects(rep.getSalesReport({ from: 'x', to: '2026-09-01' }), /fecha/i);
  await rejects(rep.getSalesReport({ from: '2026-09-10', to: '2026-09-01' }), /anterior/i);
  await rejects(rep.getSalesReport({ from: '2024-01-01', to: '2026-01-01' }), /año/i);
});

// ---------- Auditoría ----------
const aud = makeAuditUseCases({ auditRepository: { find: async () => ({ rows: [], total: 0 }) } });
await test('auditoría: diff muestra solo campos cambiados e ignora updated_at', () => {
  const d = aud.diff({ nombre: 'A', precio: 10, updated_at: '1' }, { nombre: 'A', precio: 12, updated_at: '2' });
  assert.deepEqual(d, [{ field: 'precio', before: 10, after: 12 }]);
});
await test('auditoría: diff de campo nuevo/eliminado', () => {
  const d = aud.diff({ a: 1 }, { b: 2 });
  assert.deepEqual(d.map((x) => x.field).sort(), ['a', 'b']);
});

// ---------- Configuración ----------
let updatedWith = null;
const biz = makeBusinessUseCases({ businessRepository: { getCurrent: async () => ({}), update: async (x) => (updatedWith = x) } });
await test('configuración: valida nombre, correo, logo https y colores', async () => {
  await rejects(biz.update({ name: '' }), /nombre/i);
  await rejects(biz.update({ name: 'N', email: 'x' }), /correo/i);
  await rejects(biz.update({ name: 'N', logoUrl: 'javascript:alert(1)' }), /https/i);
  await rejects(biz.update({ name: 'N', logoUrl: 'http://x.com/a.png' }), /https/i);
  await rejects(biz.update({ name: 'N', primaryColor: 'rojo' }), /primario/i);
  await rejects(biz.update({ name: 'N', secondaryColor: '#12' }), /secundario/i);
});
await test('configuración: guarda válido y convierte vacíos en null', async () => {
  await biz.update({ name: ' Mi Tienda ', logoUrl: 'https://x.com/logo.png', primaryColor: '#112233', nit: '', phone: '' });
  assert.equal(updatedWith.name, 'Mi Tienda');
  assert.equal(updatedWith.nit, null);
  assert.equal(updatedWith.primaryColor, '#112233');
});

// ---------- Tema ----------
await test('tema: darken y readableInk', () => {
  assert.equal(darken('#FFFFFF', 0.5), '#808080');
  assert.equal(darken('no-color'), 'no-color');
  assert.equal(readableInk('#FFFFFF'), '#111111');
  assert.equal(readableInk('#0F6B4C'), '#FFFFFF');
});
await test('tema: applyBrand fija y limpia variables CSS', () => {
  const vars = new Map();
  const root = { style: { setProperty: (k, v) => vars.set(k, v), removeProperty: (k) => vars.delete(k) } };
  applyBrand({ primaryColor: '#336699', secondaryColor: 'zzz' }, root);
  assert.equal(vars.get('--color-primary'), '#336699');
  assert.ok(vars.has('--color-primary-hover'));
  assert.ok(!vars.has('--color-secondary'));
  applyBrand(null, root);
  assert.equal(vars.size, 0);
});

console.log(`\n${passed} pruebas pasaron correctamente.`);
