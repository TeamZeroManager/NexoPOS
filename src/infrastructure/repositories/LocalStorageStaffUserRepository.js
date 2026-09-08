import { StaffUserRepository } from '../../domain/repositories/StaffUserRepository.js';

const STORAGE_KEY = 'pos_pro_staff_users';

export class LocalStorageStaffUserRepository extends StaffUserRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async findById(id) {
    const users = await this.findAll();
    return users.find((u) => u.id === id) ?? null;
  }

  async findByUsername(username) {
    const users = await this.findAll();
    return users.find((u) => u.username === username.toLowerCase()) ?? null;
  }

  async save(user) {
    const users = await this.findAll();
    users.push(user);
    this.storage.set(STORAGE_KEY, users);
    return user;
  }

  async update(id, changes) {
    const users = await this.findAll();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...changes };
    this.storage.set(STORAGE_KEY, users);
    return users[index];
  }
}
