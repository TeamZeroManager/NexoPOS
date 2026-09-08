import { createBusiness } from '../../domain/entities/Business.js';
import { createBranch } from '../../domain/entities/Branch.js';
import { createRole } from '../../domain/entities/Role.js';
import { createStaffUser } from '../../domain/entities/StaffUser.js';
import { assertPasswordStrength, assertUniqueUsername } from '../../domain/rules/authRules.js';
import { hashPassword } from '../../shared/utils/crypto.js';
import { ALL_PERMISSIONS } from '../../shared/constants/permissions.js';

/**
 * setupUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Orquestar la "Configuración inicial" (Fase 0): crear el
 *   negocio, su primera sucursal, el rol Administrador (con todos
 *   los permisos activos) y el usuario administrador. Este paso
 *   solo debe poder ejecutarse una vez — isSetupComplete() es la
 *   guardia que la UI consulta antes de mostrar el asistente.
 */
export function makeSetupUseCases({ businessRepository, branchRepository, roleRepository, staffUserRepository }) {
  return {
    async isSetupComplete() {
      const business = await businessRepository.getCurrent();
      return business != null;
    },

    async setupBusiness({ businessName, nit, branchName, cashPointName, adminName, username, password }) {
      assertPasswordStrength(password);
      const existingUsers = await staffUserRepository.findAll();
      assertUniqueUsername(existingUsers, username);

      const business = createBusiness({ name: businessName, nit });
      await businessRepository.save(business);

      const branch = createBranch({ name: branchName, businessId: business.id, cashPointName });
      await branchRepository.save(branch);

      const adminRole = createRole({ name: 'Administrador', permissions: ALL_PERMISSIONS });
      await roleRepository.save(adminRole);

      const passwordHash = await hashPassword(password);
      const adminUser = createStaffUser({
        name: adminName,
        username,
        passwordHash,
        roleId: adminRole.id,
      });
      await staffUserRepository.save(adminUser);

      return { business, branch, adminRole, adminUser };
    },
  };
}
