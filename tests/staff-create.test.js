// Alta de usuarios por Edge Function: el error del servidor debe llegar al usuario.
// Ejecutar con: node --import ./tests/support/register.mjs tests/staff-create.test.js
import assert from 'node:assert/strict';

let reply;
globalThis.__fakeSupabase = { functions: { invoke: async () => reply } };
const { SupabaseStaffUserRepository } = await import('../src/infrastructure/repositories/SupabaseStaffUserRepository.js');
const repo = new SupabaseStaffUserRepository();
const input = { nombre: 'Juan', username: 'juan', password: 'clave12345', rolId: 'r1' };
const httpError = (body, raw = false) => ({
  data: null,
  error: { message: 'Edge Function returned a non-2xx status code', context: { json: async () => { if (raw) throw new Error('no es json'); return body; } } },
});

let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log(`✅ ${name}`); }

await test('éxito: devuelve el id del usuario creado', async () => {
  reply = { data: { id: 'u9' }, error: null };
  assert.deepEqual(await repo.createViaEdgeFunction(input), { id: 'u9' });
});
await test('error 4xx de la función: muestra el motivo real, no el mensaje genérico', async () => {
  reply = httpError({ error: 'La contrasena debe tener minimo 8 caracteres' });
  await assert.rejects(repo.createViaEdgeFunction(input), /minimo 8 caracteres/);
});
await test('error del gateway {message} (JWT vencido): pide volver a entrar', async () => {
  reply = httpError({ code: 401, message: 'Invalid JWT' });
  await assert.rejects(repo.createViaEdgeFunction(input), /sesión expiró/);
});
await test('cuerpo que no es JSON: no se cae y usa un mensaje legible', async () => {
  reply = httpError(null, true);
  await assert.rejects(repo.createViaEdgeFunction(input), /No se pudo crear el usuario/);
});
await test('200 con {error}: también se informa', async () => {
  reply = { data: { error: 'Rol invalido' }, error: null };
  await assert.rejects(repo.createViaEdgeFunction(input), /Rol invalido/);
});

console.log(`\n${passed} pruebas pasaron correctamente.`);
