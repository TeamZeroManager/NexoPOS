/** CustomerRepository (interfaz conceptual) — ver ProductRepository.js para el patrón. */
export class CustomerRepository {
  async findAll() {
    throw new Error('CustomerRepository.findAll no implementado');
  }
  async findById(id) {
    throw new Error('CustomerRepository.findById no implementado');
  }
  async save(customer) {
    throw new Error('CustomerRepository.save no implementado');
  }
  async update(id, changes) {
    throw new Error('CustomerRepository.update no implementado');
  }
}
