import { assertValidCredentials } from '../../domain/rules/authRules.js';
import { hashPassword } from '../../shared/utils/crypto.js';

/**
 * authUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Iniciar sesión, cerrarla, y recuperar la sesión activa al
 *   recargar la página. La UI (login, panel) SOLO debe llamar a
 *   estas funciones — nunca comparar contraseñas ni tocar
 *   SessionStore directamente.
 *
 * Dependencias:
 *   staffUserRepository, roleRepository, sessionStore
 */
export function makeAuthUseCases({ staffUserRepository, roleRepository, sessionStore }) {
  async function enrichSession(userId) {
    const user = await staffUserRepository.findById(userId);
    if (!user || !user.active) return null;
    const role = await roleRepository.findById(user.roleId);
    return { user, role };
  }

  return {
    async login(username, password) {
      const user = await staffUserRepository.findByUsername(username);
      const computedHash = await hashPassword(password);
      assertValidCredentials(user, computedHash); // lanza ValidationError si no coincide

      sessionStore.set(user.id);
      const role = await roleRepository.findById(user.roleId);
      return { user, role };
    },

    logout() {
      sessionStore.clear();
    },

    /** Sesión activa al cargar la página, o null si no hay ninguna (o quedó inválida). */
    async getCurrentSession() {
      const session = sessionStore.get();
      if (!session) return null;
      const enriched = await enrichSession(session.userId);
      if (!enriched) {
        sessionStore.clear(); // el usuario fue desactivado/borrado desde que inició sesión
        return null;
      }
      return enriched;
    },
  };
}
