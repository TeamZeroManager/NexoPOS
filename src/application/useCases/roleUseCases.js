import { createRole } from '../../domain/entities/Role.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * roleUseCases
 * ---------------------------------------------------------
 * Responsabilidad: crear y listar roles con sus permisos (RBAC).
 */
export function makeRoleUseCases({ roleRepository }) {
  return {
    async listRoles() {
      return roleRepository.findAll();
    },

    async createRole({ name, permissions }) {
      const existing = await roleRepository.findAll();
      if (existing.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
        throw new ValidationError('Ya existe un rol con ese nombre', 'name');
      }
      const role = createRole({ name, permissions });
      return roleRepository.save(role);
    },

    /** Útil para la UI: ¿el rol de la sesión activa tiene este permiso? */
    hasPermission(role, permissionKey) {
      return Boolean(role?.permissions?.includes(permissionKey));
    },
  };
}
