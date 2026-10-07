import assert from 'node:assert/strict';
import { escapeHtml, safeImageUrl } from '../src/shared/utils/escape.js';
import { assertValidUsername, assertPasswordStrength } from '../src/domain/rules/authRules.js';
import { makeSaleUseCases } from '../src/application/useCases/saleUseCases.js';
import { makeProductUseCases } from '../src/application/useCases/productUseCases.js';

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log(`✅ ${name}`);
}

await test('escapeHtml escapa comillas: un atributo no se puede cerrar', () => {
  const evil = 'x" onerror="alert(1)';
  const html = `<img src="${escapeHtml(evil)}">`;
  assert.ok(!html.includes('" onerror='), html);
  assert.equal(escapeHtml(`<b>&'"`), '&lt;b&gt;&amp;&#39;&quot;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(0), '0');
});

await test('safeImageUrl: solo http(s) y data:image; bloquea javascript: y data:text/html', () => {
  assert.equal(safeImageUrl('https://x.com/a.png'), 'https://x.com/a.png');
  assert.equal(safeImageUrl('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(safeImageUrl('javascript:alert(1)'), '');
  assert.equal(safeImageUrl('data:text/html;base64,PHNjcmlwdD4='), '');
  assert.equal(safeImageUrl(' JaVaScRiPt:alert(1)'), '');
  assert.equal(safeImageUrl(undefined), '');
});

await test('usuario: 3-30 caracteres [a-z0-9._-]; rechaza @, espacios y cortos', () => {
  assert.doesNotThrow(() => assertValidUsername('Maria.Lopez'));
  for (const bad of ['ab', 'con espacio', 'a@b.co', 'x'.repeat(31), '', null]) {
    assert.throws(() => assertValidUsername(bad), /usuario/i, String(bad));
  }
});

await test('contraseña: mínimo 8', () => {
  assert.throws(() => assertPasswordStrength('abc1234'));
  assert.doesNotThrow(() => assertPasswordStrength('abc12345'));
});

await test('anular venta: exige id y motivo; delega en el repositorio con el motivo recortado', async () => {
  const calls = [];
  const uc = makeSaleUseCases({ saleRepository: { cancelTransactional: async (id, r) => (calls.push([id, r]), { id }) } });
  await assert.rejects(uc.cancelSale('', 'motivo'), /venta/i);
  await assert.rejects(uc.cancelSale('v1', ' a '), /motivo/i);
  assert.equal(calls.length, 0);
  await uc.cancelSale('v1', '  devolución  ');
  assert.deepEqual(calls[0], ['v1', 'devolución']);
});

await test('producto: la imagen insegura se rechaza al crear y al editar', async () => {
  const uc = makeProductUseCases({ productRepository: { save: async (p) => p, update: async (id, c) => c, findAll: async () => [] }, categoryRepository: {} });
  const base = { name: 'P', price: 1000, stock: 1, categoryId: 'c1' };
  await assert.rejects(uc.createProduct({ ...base, image: 'javascript:alert(1)' }), /imagen/i);
  await assert.rejects(uc.updateProduct('p1', { image: 'x" onerror="y' }), /imagen/i);
  await uc.createProduct({ ...base, image: 'https://x.com/a.png' });
  await uc.updateProduct('p1', { image: 'https://x.com/b.png' });
});

console.log(`\n${passed} pruebas pasaron correctamente.`);
