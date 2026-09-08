import { showToast } from '../components/toast.js';
import { formatDate } from '../../shared/utils/format.js';

/**
 * makeUsersScreen
 * ---------------------------------------------------------
 * Responsabilidad: crear usuarios del sistema (cajeros,
 * administradores) y listarlos con su rol asignado. Reutiliza
 * las mismas reglas de auth que el setup inicial.
 */
export function makeUsersScreen({ staffUserUseCases, roleUseCases, currentUserId }) {
  const container = document.getElementById('pageUsuarios');

  async function render() {
    const [users, roles] = await Promise.all([staffUserUseCases.listUsersWithRole(), roleUseCases.listRoles()]);

    container.innerHTML = `
      <div class="card-section">
        <strong style="display:block;margin-bottom:12px;">Nuevo usuario</strong>
        <div class="field-row" style="margin-bottom:12px;">
          <label class="field-label">
            Nombre completo
            <input class="search-input" id="newUserName" placeholder="Ej: María Gómez">
          </label>
          <label class="field-label">
            Rol
            <select class="search-input" id="newUserRole">
              ${roles.map((r) => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="field-row">
          <label class="field-label">
            Usuario
            <input class="search-input" id="newUserUsername" placeholder="ej: mgomez" autocomplete="off">
          </label>
          <label class="field-label">
            Contraseña
            <input class="search-input" id="newUserPassword" type="password" placeholder="Mínimo 6 caracteres">
          </label>
        </div>
        <button class="btn btn--primary" id="btnCreateUser" style="margin-top:16px;">Crear usuario</button>
      </div>

      <div class="card-section">
        <strong style="display:block;margin-bottom:8px;">Usuarios (${users.length})</strong>
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Creado</th><th></th></tr></thead>
          <tbody>
            ${users
              .map(
                (u) => `
              <tr>
                <td>${escapeHtml(u.name)}</td>
                <td>@${escapeHtml(u.username)}</td>
                <td>${escapeHtml(u.roleName)}</td>
                <td><span class="badge ${u.active ? 'badge--success' : 'badge--danger'}">${u.active ? 'Activo' : 'Inactivo'}</span></td>
                <td>${formatDate(u.createdAt)}</td>
                <td>${
                  u.id === currentUserId
                    ? ''
                    : `<button class="btn btn--ghost" style="height:28px;" data-toggle="${u.id}" data-active="${u.active}">${u.active ? 'Desactivar' : 'Reactivar'}</button>`
                }</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    if (roles.length === 0) {
      container.querySelector('#btnCreateUser').disabled = true;
    }

    container.querySelector('#btnCreateUser')?.addEventListener('click', async () => {
      const name = container.querySelector('#newUserName').value.trim();
      const username = container.querySelector('#newUserUsername').value.trim();
      const password = container.querySelector('#newUserPassword').value;
      const roleId = container.querySelector('#newUserRole').value;
      if (!name || !username) return;
      try {
        await staffUserUseCases.createUser({ name, username, password, roleId });
        showToast('Usuario creado', 'success');
        render();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });

    container.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.toggle;
        const isActive = btn.dataset.active === 'true';
        await (isActive ? staffUserUseCases.deactivateUser(id) : staffUserUseCases.reactivateUser(id));
        render();
      });
    });
  }

  return { render };
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
