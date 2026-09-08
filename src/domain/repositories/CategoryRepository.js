/** CategoryRepository (interfaz conceptual) — ver ProductRepository.js para el patrón. */
export class CategoryRepository {
  async findAll() {
    throw new Error('CategoryRepository.findAll no implementado');
  }
  async findById(id) {
    throw new Error('CategoryRepository.findById no implementado');
  }
  async save(category) {
    throw new Error('CategoryRepository.save no implementado');
  }
  async update(id, changes) {
    throw new Error('CategoryRepository.update no implementado');
  }
  async delete(id) {
    throw new Error('CategoryRepository.delete no implementado');
  }
}
