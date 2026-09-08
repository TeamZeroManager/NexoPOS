/** BusinessRepository (interfaz conceptual) — ver ProductRepository.js para el patrón. */
export class BusinessRepository {
  async getCurrent() {
    throw new Error('BusinessRepository.getCurrent no implementado');
  }
  async save(business) {
    throw new Error('BusinessRepository.save no implementado');
  }
}
