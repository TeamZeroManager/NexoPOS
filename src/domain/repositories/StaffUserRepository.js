/** StaffUserRepository (interfaz conceptual) — ver ProductRepository.js para el patrón. */
export class StaffUserRepository {
  async findAll() {
    throw new Error('StaffUserRepository.findAll no implementado');
  }
  async findById(id) {
    throw new Error('StaffUserRepository.findById no implementado');
  }
  async findByUsername(username) {
    throw new Error('StaffUserRepository.findByUsername no implementado');
  }
  async save(user) {
    throw new Error('StaffUserRepository.save no implementado');
  }
  async update(id, changes) {
    throw new Error('StaffUserRepository.update no implementado');
  }
}
