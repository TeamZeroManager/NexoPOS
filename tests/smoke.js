// ---------- Supabase falso ----------
const USER_ID = '00000000-0000-0000-0000-000000000001', EMP = '00000000-0000-0000-0000-0000000000e1', ROL = '00000000-0000-0000-0000-0000000000a1';
const ALL = ['MANAGE_USERS','MANAGE_SETTINGS','MANAGE_INVENTORY','REGISTER_SALES','CHANGE_PRICE_AT_POS','VIEW_REPORTS','MANAGE_ROLES','MANAGE_PRODUCTS','MANAGE_PURCHASES','CANCEL_SALES','OPEN_CLOSE_CASH'];
const ROWS = {
  usuarios: { id: USER_ID, empresa_id: EMP, nombre: 'Admin', username: 'admin', rol_id: ROL, activo: true, created_at: new Date().toISOString() },
  roles: { id: ROL, empresa_id: EMP, nombre: 'Administrador', permisos: ALL, created_at: new Date().toISOString() },
  empresas: { id: EMP, nombre: 'Mi Negocio', nit: '1', color_primario: '#336699', logo_url: 'https://x.com/l.png' },
  sucursales: { id: 's1', empresa_id: EMP, nombre: 'Principal', cash_point_name: 'Caja 1' },
};
const calls = [];
function chain(table) {
  const row = ROWS[table] ?? null;
  const q = new Proxy(function () {}, {
    get(_, prop) {
      if (prop === 'then') return (res) => res({ data: row ? [row] : [], error: null, count: row ? 1 : 0 });
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: row, error: null });
      return (...a) => { calls.push(`${table}.${String(prop)}`); return q; };
    },
  });
  return q;
}
globalThis.__fakeSupabase = {
  auth: {
    getSession: async () => ({ data: { session: { user: { id: USER_ID }, access_token: 't' } } }),
    getUser: async () => ({ data: { user: { id: USER_ID } } }),
    signInWithPassword: async () => ({ data: { user: { id: USER_ID }, session: {} }, error: null }),
    signUp: async () => ({ data: { user: { id: USER_ID }, session: {} }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  from: (t) => chain(t),
  rpc: async (name) => { calls.push(`rpc.${name}`); return { data: name === 'setup_business' ? { empresa_id: EMP, rol_id: ROL } : {}, error: null }; },
  functions: { invoke: async () => ({ data: {}, error: null }) },
};

// ---------- DOM falso ----------
const handlers = [], elements = new Map();
function stub(id = '?') {
  const styleObj = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; }, cssText: '' };
  const target = { id, style: styleObj, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, children: [], value: '', textContent: '', innerHTML: '', hidden: false, elements: {} };
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'addEventListener') return (ev, fn) => { if (ev === 'click' || ev === 'submit') handlers.push({ id, ev, fn }); };
      if (p === 'querySelectorAll') return () => [];
      if (p === 'closest' || p === 'querySelector' || p === 'append' || p === 'appendChild' || p === 'replaceChildren' || p === 'prepend' || p === 'after' || p === 'before') return (...a) => stub(`${id}>${String(p)}`);
      if (typeof p === 'symbol') return undefined;
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.document = {
  getElementById: (id) => { if (!elements.has(id)) elements.set(id, stub(id)); return elements.get(id); },
  createElement: (tag) => stub(`<${tag}>`),
  createDocumentFragment: () => stub('frag'),
  querySelector: () => stub('qs'), querySelectorAll: () => [],
  documentElement: stub('html'), body: stub('body'), addEventListener() {},
};
globalThis.window = globalThis;
globalThis.FormData = class { constructor() { this.m = { username: 'admin', password: 'clave12345', businessName: 'Neg', adminName: 'Adm', nit: '', branchName: 'P', cashPointName: 'C1' }; } get(k) { return this.m[k] ?? ''; } entries() { return Object.entries(this.m); } };
globalThis.Event = class {}; globalThis.CustomEvent = class {};
globalThis.HTMLElement = class {};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'smoke' }, configurable: true });

const errors = [];
process.on('unhandledRejection', (e) => errors.push(`unhandledRejection: ${e?.stack?.split('\n').slice(0, 3).join(' | ') ?? e}`));
process.on('uncaughtException', (e) => errors.push(`uncaughtException: ${e?.stack?.split('\n').slice(0, 3).join(' | ') ?? e}`));

const root = process.argv[2] ?? process.cwd();
await import(`${root}/src/main.js`);
await new Promise((r) => setTimeout(r, 300));
console.log(`arranque: ${handlers.length} manejadores de click/submit registrados, errores hasta aquí: ${errors.length}`);

// Dispara TODOS los clicks (menú lateral, pantallas) y espera a que terminen los render asincrónicos
let fired = 0;
for (const h of [...handlers]) {
  try { await h.fn({ preventDefault() {}, stopPropagation() {}, target: stub('t'), currentTarget: stub('ct') }); fired++; }
  catch (e) { errors.push(`click en #${h.id}: ${e?.stack?.split('\n').slice(0, 3).join(' | ')}`); }
}
await new Promise((r) => setTimeout(r, 500));
console.log(`clicks disparados: ${fired}/${handlers.length}`);
console.log(`consultas a Supabase simuladas: ${calls.length} (ej: ${[...new Set(calls)].slice(0, 8).join(', ')})`);
console.log(errors.length ? `ERRORES (${errors.length}):\n- ` + [...new Set(errors)].join('\n- ') : 'SIN ERRORES de ejecución');
process.exit(0);
