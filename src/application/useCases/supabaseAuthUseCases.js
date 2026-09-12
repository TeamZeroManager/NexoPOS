import { supabase } from '../../infrastructure/supabaseClient.js';
import { clearEmpresaIdCache } from '../../infrastructure/supabaseSession.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * makeSupabaseAuthUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Misma forma pública que makeAuthUseCases (login, logout,
 *   getCurrentSession) — loginScreen.js y setupScreen.js NO saben
 *   ni necesitan saber si el backend es LocalStorage o Supabase.
 *
 *   El "username" visible en la UI se traduce a un correo interno
 *   (username@pos.local) para Supabase Auth, que exige un email.
 *   Esto es invisible para quien usa el sistema — sigue viendo
 *   "Usuario" y "Contraseña", igual que antes (mismo flujo visual).
 *
 * Dependencias:
 *   staffUserRepository, roleRepository (para traer nombre/rol tras
 *   validar credenciales con Supabase Auth).
 */
function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@pos.local`;
}

export function makeSupabaseAuthUseCases({ staffUserRepository, roleRepository }) {
  async function enrichSession(userId) {
    const user = await staffUserRepository.findById(userId);
    if (!user || !user.active) return null;
    const role = await roleRepository.findById(user.roleId);
    return { user, role };
  }

  return {
    async login(username, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (error || !data?.user) {
        throw new ValidationError('Usuario o contraseña incorrectos', 'credentials');
      }

      const enriched = await enrichSession(data.user.id);
      if (!enriched) {
        await supabase.auth.signOut();
        throw new ValidationError('Usuario o contraseña incorrectos', 'credentials');
      }
      return enriched;
    },

    async logout() {
      clearEmpresaIdCache();
      await supabase.auth.signOut();
    },

    async getCurrentSession() {
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      if (!userId) return null;

      const enriched = await enrichSession(userId);
      if (!enriched) {
        await supabase.auth.signOut();
        return null;
      }
      return enriched;
    },
  };
}

export { usernameToEmail };
