import { el, badge, button, table, formModal } from '../components/dom.js';
import { showToast } from '../components/toast.js';

/** Proveedores: alta, edición y activación. Un proveedor con órdenes se desactiva, no se elimina. */
export function makeProveedoresScreen({ supplierUseCases }) {
  const container = document.getElementById('pageProveedores');
  let suppliers = [];
  let showInactive = false;

  const fields = (s = {}) => [
    { name: 'name', label: 'Nombre', required: true, value: s.name },
    { name: 'nit', label: 'NIT', value: s.nit },
    { name: 'contact', label: 'Persona de contacto', value: s.contact },
    { name: 'phone', label: 'Teléfono', type: 'tel', value: s.phone },
    { name: 'email', label: 'Correo', type: 'email', value: s.email },
    { name: 'address', label: 'Dirección', value: s.address },
  ];

  function openForm(supplier = null) {
    formModal({
      id: 'supplier-form', title: supplier ? 'Editar proveedor' : 'Nuevo proveedor', fields: fields(supplier ?? {}),
      onSubmit: async (v) => {
        if (supplier) await supplierUseCases.update(supplier.id, v);
        else await supplierUseCases.create(v);
        showToast(supplier ? 'Proveedor actualizado' : 'Proveedor creado', 'success');
        await render();
      },
    });
  }

  async function toggle(s) {
    try {
      await supplierUseCases.setActive(s.id, !s.active);
      showToast(s.active ? 'Proveedor desactivado' : 'Proveedor activado', 'success');
      await render();
    } catch (e) { showToast(e.message, 'danger'); }
  }

  function draw() {
    const visible = suppliers.filter((s) => showInactive || s.active);
    const check = el('input', { type: 'checkbox', checked: showInactive });
    check.addEventListener('change', (e) => { showInactive = e.target.checked; draw(); });
    container.replaceChildren(el('div', { className: 'card-section' }, [
      el('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap;' }, [
        el('strong', { textContent: `Proveedores (${visible.length})`, style: 'flex:1;' }),
        el('label', { style: 'display:flex;gap:6px;align-items:center;font-size:0.875rem;' }, [check, 'Ver inactivos']),
        button('+ Nuevo proveedor', () => openForm(), 'primary'),
      ]),
      table(['Nombre', 'NIT', 'Contacto', 'Teléfono', 'Correo', 'Estado', ''],
        visible.map((s) => [s.name, s.nit ?? '—', s.contact ?? '—', s.phone ?? '—', s.email ?? '—',
          badge(s.active ? 'Activo' : 'Inactivo', s.active ? 'success' : 'danger'),
          el('span', { style: 'white-space:nowrap;display:flex;gap:6px;' }, [button('Editar', () => openForm(s)), button(s.active ? 'Desactivar' : 'Activar', () => toggle(s))])]),
        'Aún no hay proveedores.'),
    ]));
  }

  async function render() {
    suppliers = await supplierUseCases.list();
    draw();
  }
  return { render };
}
