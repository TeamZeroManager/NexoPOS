/**
 * auth.test.js
 * ---------------------------------------------------------
 * Ejecutar con: node tests/auth.test.js
 */
import assert from 'node:assert';
import { assertPasswordStrength, assertUniqueUsername, assertValidCredentials } from '../src/domain/rules/authRules.js';
import { hashPassword } from '../src/shared/utils/crypto.js';

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

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    process.exitCode = 1;
  }
}

test('assertPasswordStrength rechaza contraseñas cortas', () => {
  assert.throws(() => assertPasswordStrength('123'));
});

test('assertPasswordStrength acepta 6+ caracteres', () => {
  assert.doesNotThrow(() => assertPasswordStrength('123456'));
});

test('assertUniqueUsername rechaza username duplicado (sin importar mayúsculas)', () => {
  const existing = [{ username: 'admin' }];
  assert.throws(() => assertUniqueUsername(existing, 'Admin'));
});

test('assertUniqueUsername acepta username nuevo', () => {
  const existing = [{ username: 'admin' }];
  assert.doesNotThrow(() => assertUniqueUsername(existing, 'cajero1'));
});

test('assertValidCredentials rechaza usuario inexistente', () => {
  assert.throws(() => assertValidCredentials(null, 'cualquier-hash'));
});

test('assertValidCredentials rechaza usuario inactivo', () => {
  const user = { active: false, passwordHash: 'abc' };
  assert.throws(() => assertValidCredentials(user, 'abc'));
});

test('assertValidCredentials rechaza hash incorrecto', () => {
  const user = { active: true, passwordHash: 'abc' };
  assert.throws(() => assertValidCredentials(user, 'xyz'));
});

test('assertValidCredentials acepta hash correcto', () => {
  const user = { active: true, passwordHash: 'abc' };
  assert.doesNotThrow(() => assertValidCredentials(user, 'abc'));
});

await asyncTest('hashPassword es determinístico (mismo password -> mismo hash)', async () => {
  const a = await hashPassword('miClave123');
  const b = await hashPassword('miClave123');
  assert.strictEqual(a, b);
});

await asyncTest('hashPassword produce hashes distintos para contraseñas distintas', async () => {
  const a = await hashPassword('miClave123');
  const b = await hashPassword('otraClave456');
  assert.notStrictEqual(a, b);
});

console.log(`\n${passed} pruebas pasaron correctamente.`);
