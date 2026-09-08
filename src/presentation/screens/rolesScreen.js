import { showToast } from '../components/toast.js';
import { PERMISSIONS, PERMISSION_LABELS } from '../../shared/constants/permissions.js';

// Mismo orden de dos columnas que la referencia visual.
const LEFT_COLUMN = [
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MANAGE_SETTINGS,
  PERMISSIONS.MANAGE_INVENTORY,
  PERMISSIONS.REGISTER_SALES,
  PERMISSIONS.CHANGE_PRICE_AT_POS,
  PERMISSIONS.VIEW_REPORTS,
];
const RIGHT_COLUMN = [
  PERMISSIONS.MANAGE_ROLES,
  PERMISSIONS.MANAGE_PRODUCTS,
  PERMISSIONS.MANAGE_PURCHASES,
  PERMISSIONS.CANCEL_SALES,
  PERMISSIONS.OPEN_CLOSE_CASH,
];

/**
 * makeRolesScreen
 * ---------------------------------------------------------
 * Responsabilidad: formulario "Nuevo rol" + tabla de roles
 * existentes, calcando la referencia que compartiste. Cada casilla
 * corresponde a una clave de shared/constants/permissions.js.
 */
export function makeRolesScreen({ roleUseCases }) {
  const container = document.getElementById('pageRoles');

  function permissionCheckbox(key) {
    return `
      <label class="permission-checkbox">
        <input type="checkbox" value="${key}" name="permission">
        ${PERMISSION_LABELS[key]}
      </label>
    `;
  }

  async function render() {
    const roles = await roleUseCases.listRoles();
    container.innerHTML = `
      <div class="card-section">
        <strong style="display:block;margin-bottom:12px;">Nuevo rol</strong>
        <label class="field-label" style="margin-bottom:12px;">
          Nombre del rol
          <input class="search-input" id="newRoleName" placeholder="Cajero, Supervisor, etc.">
        </label>
        <strong style="display:block;margin-bottom:8px;font-size:0.875rem;">Permisos</strong>
        <div class="permission-grid" id="permissionGrid">
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${LEFT_COLUMN.map(permissionCheckbox).join('')}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${RIGHT_COLUMN.map(permissionCheckbox).join('')}
          </div>
        </div>
        <button class="btn btn--primary" id="btnCreateRole" style="margin-top:16px;">Crear rol</button>
      </div>

      <div class="card-section">
        <strong style="display:block;margin-bottom:8px;">Roles (${roles.length})</strong>
        <table class="data-table">
          <thead><tr><th>Rol</th><th>Permisos</th></tr></thead>
          <tbody>
            ${roles
              .map(
                (role) => `
              <tr>
                <td style="white-space:nowrap;vertical-align:top;">${escapeHtml(role.name)}</td>
                <td>${role.permissions.map((p) => PERMISSION_LABELS[p] ?? p).join(', ') || '—'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    container.querySelector('#btnCreateRole').addEventListener('click', async () => {
      const name = container.querySelector('#newRoleName').value.trim();
      const permissions = Array.from(container.querySelectorAll('input[name="permission"]:checked')).map((el) => el.value);
      if (!name) return;
      try {
        await roleUseCases.createRole({ name, permissions });
        showToast('Rol creado', 'success');
        render();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });
  }

  return { render };
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
