/** MovementRepository (interfaz conceptual) — ver ProductRepository.js para el patrón. */
export class MovementRepository {
  async findAll() {
    throw new Error('MovementRepository.findAll no implementado');
  }
  async findByDateRange(from, to) {
    throw new Error('MovementRepository.findByDateRange no implementado');
  }
  async save(movement) {
    throw new Error('MovementRepository.save no implementado');
  }
}
