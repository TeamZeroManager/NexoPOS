import { RoleRepository } from '../../domain/repositories/RoleRepository.js';

const STORAGE_KEY = 'pos_pro_roles';

export class LocalStorageRoleRepository extends RoleRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async findById(id) {
    const roles = await this.findAll();
    return roles.find((r) => r.id === id) ?? null;
  }

  async save(role) {
    const roles = await this.findAll();
    roles.push(role);
    this.storage.set(STORAGE_KEY, roles);
    return role;
  }
}
