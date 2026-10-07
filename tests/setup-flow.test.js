// Flujo de registro del negocio contra un Supabase simulado.
// Ejecutar con: node --import ./tests/support/register.mjs tests/setup-flow.test.js
import assert from 'node:assert/strict';

const ALREADY = { message: 'User already registered' };
let scenario;
const rpcCalls = [];
let signedOut = 0;

// El cliente se crea al importar el módulo: el objeto debe existir antes y se muta por escenario.
globalThis.__fakeSupabase = {};
function install(s) {
  scenario = s; rpcCalls.length = 0; signedOut = 0;
  Object.assign(globalThis.__fakeSupabase, {
    auth: {
      signUp: async () => scenario.signUp,
      signInWithPassword: async () => scenario.signIn,
      signOut: async () => { signedOut++; return {}; },
      getUser: async () => ({ data: { user: { id: 'u1' } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { empresa_id: 'e1' } }), maybeSingle: async () => ({ data: null }) }) }) }),
    rpc: async (name, args) => { rpcCalls.push([name, args]); return scenario.rpc ?? { data: { empresa_id: 'e1', rol_id: 'r1' }, error: null }; },
  });
}

const { makeSupabaseSetupUseCases } = await import('../src/application/useCases/supabaseSetupUseCases.js');
const input = { businessName: 'Neg', nit: '', branchName: 'P', cashPointName: 'C', adminName: 'Adm', username: 'Admin', password: 'clave12345' };
const uc = (hasProfile) => makeSupabaseSetupUseCases({
  staffUserRepository: { findById: async () => (hasProfile ? { id: 'u1' } : null) },
  roleRepository: { findById: async () => ({ id: 'r1' }) },
});

let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log(`✅ ${name}`); }

await test('registro nuevo: signUp con sesión -> setup_business con usuario normalizado', async () => {
  install({ signUp: { data: { user: { id: 'u1' }, session: {} }, error: null } });
  await uc(false).setupBusiness(input);
  assert.equal(rpcCalls[0][0], 'setup_business');
  assert.equal(rpcCalls[0][1].p_username, 'admin');
});

await test('cuenta HUÉRFANA + misma contraseña: se retoma el registro (no dice "en uso")', async () => {
  install({ signUp: { data: {}, error: ALREADY }, signIn: { data: { user: { id: 'u1' }, session: {} }, error: null } });
  await uc(false).setupBusiness(input);
  assert.equal(rpcCalls.length, 1, 'debe llamar a setup_business');
});

await test('cuenta HUÉRFANA + contraseña distinta: "Ese nombre de usuario ya está en uso"', async () => {
  install({ signUp: { data: {}, error: ALREADY }, signIn: { data: {}, error: { message: 'Invalid login credentials' } } });
  await assert.rejects(uc(false).setupBusiness(input), /ya está en uso/);
  assert.equal(rpcCalls.length, 0);
});

await test('usuario que YA tiene negocio: "en uso" y se cierra la sesión abierta', async () => {
  install({ signUp: { data: {}, error: ALREADY }, signIn: { data: { user: { id: 'u1' }, session: {} }, error: null } });
  await assert.rejects(uc(true).setupBusiness(input), /ya está en uso/);
  assert.equal(signedOut, 1);
  assert.equal(rpcCalls.length, 0);
});

await test('si falla setup_business, el mensaje indica reintentar con el mismo usuario y contraseña', async () => {
  install({ signUp: { data: { user: { id: 'u1' }, session: {} }, error: null }, rpc: { data: null, error: { message: 'El nombre del negocio es obligatorio' } } });
  await assert.rejects(uc(false).setupBusiness(input), /mismo usuario y contraseña/);
});

await test('validaciones previas: contraseña corta y usuario inválido no llaman a Supabase', async () => {
  install({ signUp: { data: { user: { id: 'u1' }, session: {} }, error: null } });
  await assert.rejects(uc(false).setupBusiness({ ...input, password: '1234567' }), /8 caracteres/);
  await assert.rejects(uc(false).setupBusiness({ ...input, username: 'a@b' }), /usuario/i);
  assert.equal(rpcCalls.length, 0);
});

console.log(`\n${passed} pruebas pasaron correctamente.`);
