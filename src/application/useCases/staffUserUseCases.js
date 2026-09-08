import { createStaffUser } from '../../domain/entities/StaffUser.js';
import { assertPasswordStrength, assertUniqueUsername } from '../../domain/rules/authRules.js';
import { hashPassword } from '../../shared/utils/crypto.js';

/**
 * staffUserUseCases
 * ---------------------------------------------------------
 * Responsabilidad: CRUD de usuarios del sistema (cajeros,
 * administradores), reutilizando las mismas reglas de auth que
 * el setup inicial (contraseña fuerte, username único).
 */
export function makeStaffUserUseCases({ staffUserRepository, roleRepository }) {
  return {
    async listUsersWithRole() {
      const [users, roles] = await Promise.all([staffUserRepository.findAll(), roleRepository.findAll()]);
      return users.map((user) => ({
        ...user,
        roleName: roles.find((r) => r.id === user.roleId)?.name ?? 'Sin rol',
      }));
    },

    async createUser({ name, username, password, roleId }) {
      assertPasswordStrength(password);
      const existingUsers = await staffUserRepository.findAll();
      assertUniqueUsername(existingUsers, username);

      const passwordHash = await hashPassword(password);
      const user = createStaffUser({ name, username, passwordHash, roleId });
      return staffUserRepository.save(user);
    },

    async deactivateUser(id) {
      return staffUserRepository.update(id, { active: false });
    },

    async reactivateUser(id) {
      return staffUserRepository.update(id, { active: true });
    },
  };
}
