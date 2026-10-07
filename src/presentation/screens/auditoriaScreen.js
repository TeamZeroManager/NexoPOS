import { formatDate } from '../../shared/utils/format.js';
import { el, badge, button, table } from '../components/dom.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const TABLES = { productos: 'Productos', categorias: 'Categorías', clientes: 'Clientes', proveedores: 'Proveedores', ordenes_compra: 'Órdenes de compra', ventas: 'Ventas', cajas: 'Cajas', roles: 'Roles', usuarios: 'Usuarios', empresas: 'Negocio' };
const ACTIONS = { INSERT: ['Creó', 'success'], UPDATE: ['Modificó', 'pending'], DELETE: ['Eliminó', 'danger'] };
const PAGE = 50;
const show = (v) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Auditoría: bitácora de solo lectura (quién, qué y cuándo) con filtros y paginación. */
export function makeAuditoriaScreen({ auditUseCases }) {
  const container = document.getElementById('pageAuditoria');
  const state = { table: '', action: '', from: '', to: '', page: 0, total: 0, rows: [] };

  const dayStart = (v) => (v ? new Date(`${v}T00:00:00`).toISOString() : null);
  const nextDay = (v) => { if (!v) return null; const d = new Date(`${v}T00:00:00`); d.setDate(d.getDate() + 1); return d.toISOString(); };

  async function load() {
    const { rows, total } = await auditUseCases.list({
      table: state.table, action: state.action, fromIso: dayStart(state.from), toIso: nextDay(state.to), limit: PAGE, offset: state.page * PAGE,
    });
    state.rows = rows; state.total = total;
  }

  function openDetail(r) {
    const body = el('div');
    if (r.action === 'UPDATE') {
      body.append(table(['Campo', 'Antes', 'Después'], auditUseCases.diff(r.before, r.after).map((d) => [d.field, show(d.before), show(d.after)]), 'Sin cambios visibles.'));
    } else {
      body.append(el('pre', { textContent: JSON.stringify(r.action === 'INSERT' ? r.after : r.before, null, 2), style: 'white-space:pre-wrap;word-break:break-word;font-size:0.8rem;max-height:50vh;overflow:auto;' }));
    }
    openModal({ id: 'audit-detail', title: `${ACTIONS[r.action][0]} · ${TABLES[r.table] ?? r.table}`, bodyNode: body, actions: [{ label: 'Cerrar', variant: 'secondary', onClick: closeAllModals }] });
  }

  function draw() {
    const select = (key, options) => {
      const s = el('select', { className: 'search-input', style: 'max-width:190px;' }, options.map(([v, l]) => el('option', { value: v, textContent: l, selected: state[key] === v })));
      s.addEventListener('change', async (e) => { state[key] = e.target.value; state.page = 0; await render(); });
      return s;
    };
    const date = (key) => {
      const i = el('input', { type: 'date', className: 'search-input', value: state[key] });
      i.addEventListener('change', async (e) => { state[key] = e.target.value; state.page = 0; await render(); });
      return i;
    };
    const pages = Math.max(1, Math.ceil(state.total / PAGE));
    container.replaceChildren(el('div', { className: 'card-section' }, [
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;' }, [
        select('table', [['', 'Todas las tablas'], ...Object.entries(TABLES)]),
        select('action', [['', 'Todas las acciones'], ['INSERT', 'Creó'], ['UPDATE', 'Modificó'], ['DELETE', 'Eliminó']]),
        date('from'), date('to'),
      ]),
      table(['Fecha', 'Usuario', 'Acción', 'Módulo', ''], state.rows.map((r) => [
        formatDate(r.createdAt), r.userName, badge(...ACTIONS[r.action]), TABLES[r.table] ?? r.table, button('Detalle', () => openDetail(r))]),
        'No hay registros para este filtro.'),
      el('div', { style: 'display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:0.875rem;' }, [
        el('span', { textContent: `${state.total} registros · página ${state.page + 1} de ${pages}` }),
        button('Anterior', async () => { state.page--; await render(); }, 'secondary', { disabled: state.page === 0 }),
        button('Siguiente', async () => { state.page++; await render(); }, 'secondary', { disabled: state.page + 1 >= pages }),
      ]),
    ]));
  }

  async function render() {
    try { await load(); draw(); } catch (e) { showToast(e.message, 'danger'); }
  }
  return { render };
}
