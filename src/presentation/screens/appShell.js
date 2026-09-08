import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { renderPlaceholder } from './placeholderScreen.js';

/**
 * NAV_ITEMS
 * ---------------------------------------------------------
 * Cada entrada del menú lateral. `permission: null` significa que
 * cualquier usuario logueado puede verla. Si el rol de la sesión
 * activa no tiene el permiso requerido, el ítem ni siquiera se
 * pinta en el sidebar (RBAC real, no solo decorativo).
 */
const NAV_ITEMS = [
  { id: 'resumen', label: 'Resumen', permission: null },
  { id: 'pos', label: 'Punto de Venta', permission: PERMISSIONS.REGISTER_SALES },
  { id: 'ventas', label: 'Ventas', permission: PERMISSIONS.VIEW_REPORTS },
  { id: 'clientes', label: 'Clientes', permission: null },
  { id: 'reportes', label: 'Reportes', permission: PERMISSIONS.VIEW_REPORTS, placeholder: true },
  { id: 'catalogo', label: 'Catálogo', permission: PERMISSIONS.MANAGE_PRODUCTS, placeholder: true },
  { id: 'inventario', label: 'Inventario', permission: PERMISSIONS.MANAGE_INVENTORY, placeholder: true },
  { id: 'compras', label: 'Compras', permission: PERMISSIONS.MANAGE_PURCHASES, placeholder: true },
  { id: 'proveedores', label: 'Proveedores', permission: PERMISSIONS.MANAGE_PURCHASES, placeholder: true },
  { id: 'caja', label: 'Caja', permission: PERMISSIONS.OPEN_CLOSE_CASH },
  { id: 'usuarios', label: 'Usuarios', permission: PERMISSIONS.MANAGE_USERS },
  { id: 'roles', label: 'Roles y permisos', permission: PERMISSIONS.MANAGE_ROLES },
  { id: 'auditoria', label: 'Auditoría', permission: PERMISSIONS.MANAGE_SETTINGS, placeholder: true },
  { id: 'configuracion', label: 'Configuración', permission: PERMISSIONS.MANAGE_SETTINGS, placeholder: true },
];

const PLACEHOLDER_COPY = {
  reportes: ['Reportes', 'Ventas diarias/mensuales, productos más vendidos y utilidad — próximamente.'],
  catalogo: ['Catálogo', 'Vista completa del catálogo de productos — próximamente.'],
  inventario: ['Inventario', 'Ajustes de inventario y trazabilidad — próximamente.'],
  compras: ['Compras', 'Órdenes de compra a proveedores — próximamente.'],
  proveedores: ['Proveedores', 'Gestión de proveedores — próximamente.'],
  auditoria: ['Auditoría', 'Registro de quién hizo qué y cuándo (sección 38) — próximamente.'],
  configuracion: ['Configuración', 'Personalización del negocio: logo, colores, datos fiscales — próximamente.'],
};

/**
 * initAppShell
 * ---------------------------------------------------------
 * Responsabilidad: construir el menú lateral según los permisos
 * del rol de la sesión activa, manejar el cambio entre páginas, y
 * el botón de cerrar sesión.
 *
 * `screens` es un mapa { pageId: { render() } } para las páginas
 * que ya están construidas (resumen, pos, ventas, clientes, caja,
 * usuarios, roles). Las páginas sin builder real caen en el
 * placeholder genérico.
 */
export function initAppShell({ session, screens, onLogout }) {
  const sidebarNav = document.getElementById('sidebarNav');
  const panelTitle = document.getElementById('panelTitle');
  const sessionUserName = document.getElementById('sessionUserName');
  const sessionRoleName = document.getElementById('sessionRoleName');
  const btnLogout = document.getElementById('btnLogout');

  sessionUserName.textContent = session.user.name;
  sessionRoleName.textContent = `@${session.user.username}`;

  const permissions = session.role?.permissions ?? [];
  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission));

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach((el) => (el.style.display = 'none'));

    const item = NAV_ITEMS.find((i) => i.id === pageId);
    panelTitle.textContent = item?.label ?? '';

    sidebarNav.querySelectorAll('.sidebar__item').forEach((btn) => {
      btn.setAttribute('aria-current', String(btn.dataset.page === pageId));
    });

    if (item?.placeholder) {
      document.getElementById('pagePlaceholder').style.display = 'block';
      const [title, description] = PLACEHOLDER_COPY[pageId] ?? [item.label, 'Próximamente.'];
      renderPlaceholder(title, description);
      return;
    }

    const pageElId = { resumen: 'pageResumen', pos: 'pagePOS', ventas: 'pageVentas', clientes: 'pageClientes', caja: 'pageCaja', usuarios: 'pageUsuarios', roles: 'pageRoles' }[pageId];
    if (pageElId) {
      document.getElementById(pageElId).style.display = pageId === 'pos' ? 'block' : 'block';
      screens[pageId]?.render?.();
    }
  }

  sidebarNav.innerHTML = '';
  visibleItems.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sidebar__item';
    btn.textContent = item.label;
    btn.dataset.page = item.id;
    btn.addEventListener('click', () => showPage(item.id));
    sidebarNav.appendChild(btn);
  });

  btnLogout.addEventListener('click', onLogout);

  // Página inicial: Resumen (siempre visible para cualquier sesión).
  showPage('resumen');
}
