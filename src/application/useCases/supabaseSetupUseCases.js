import { supabase } from '../../infrastructure/supabaseClient.js';
import { getEmpresaId, clearEmpresaIdCache } from '../../infrastructure/supabaseSession.js';
import { ALL_PERMISSIONS } from '../../shared/constants/permissions.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import { usernameToEmail } from './supabaseAuthUseCases.js';
import { assertPasswordStrength, assertValidUsername } from '../../domain/rules/authRules.js';

/**
 * makeSupabaseSetupUseCases
 * ---------------------------------------------------------
 * A diferencia de LocalStorage, aquí "¿ya se hizo el setup?" NO es
 * una pregunta global (pueden existir muchas empresas en el mismo
 * proyecto de Supabase — es multi-tenant real). Por eso el panel de
 * entrada por defecto es el LOGIN, con un enlace a este asistente
 * para quien todavía no tiene negocio (ver main.js).
 */
export function makeSupabaseSetupUseCases({ staffUserRepository, roleRepository }) {
  return {
    async setupBusiness({ businessName, nit, branchName, cashPointName, adminName, username, password }) {
      const cleanUsername = (username ?? '').trim().toLowerCase();
      assertValidUsername(cleanUsername);
      assertPasswordStrength(password);

      let { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: usernameToEmail(cleanUsername),
        password,
      });

      if (signUpError && /already registered|already exists/i.test(signUpError.message)) {
        // Si un intento anterior creó la cuenta de Auth pero falló el resto del registro,
        // la cuenta quedó "huérfana". Con las MISMAS credenciales se retoma el registro;
        // si la cuenta ya tiene negocio (o la clave no coincide), el nombre está realmente ocupado.
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: usernameToEmail(cleanUsername),
          password,
        });
        const alreadyHasBusiness = !signInError && (await staffUserRepository.findById(signInData.user.id));
        if (signInError || alreadyHasBusiness) {
          if (!signInError) await supabase.auth.signOut();
          throw new ValidationError('Ese nombre de usuario ya está en uso', 'username');
        }
        signUpData = signInData;
        signUpError = null;
      }

      if (signUpError) {
        throw new ValidationError(signUpError.message, 'username');
      }

      if (!signUpData?.session) {
        // La confirmación de correo está activada en el dashboard de Supabase.
        // Como el correo es interno (username@pos.local), nunca llegará un
        // correo real de confirmación — hay que desactivar "Confirm email"
        // en Authentication > Providers > Email antes de usar este asistente.
        throw new ValidationError(
          'No se pudo iniciar sesión automáticamente. Verifica que "Confirm email" esté desactivado en Authentication → Providers → Email en el dashboard de Supabase.',
          'config'
        );
      }

      clearEmpresaIdCache();

      const { data: setupResult, error: setupError } = await supabase.rpc('setup_business', {
        p_nombre: businessName,
        p_nit: nit,
        p_sucursal: branchName,
        p_caja: cashPointName,
        p_admin_nombre: adminName,
        p_username: cleanUsername,
        p_permisos: ALL_PERMISSIONS,
      });

      if (setupError) {
        // La cuenta de Auth ya existe: al corregir el dato y reintentar con el mismo usuario y
        // contraseña el registro se retoma (ver recuperación arriba).
        throw new ValidationError(`${setupError.message}. Corrige el dato y vuelve a intentarlo con el mismo usuario y contraseña.`, 'setup');
      }

      const empresaId = await getEmpresaId();
      const user = await staffUserRepository.findById(signUpData.user.id);
      const role = await roleRepository.findById(setupResult.rol_id);

      return { business: { id: empresaId }, adminUser: user, adminRole: role };
    },
  };
}
