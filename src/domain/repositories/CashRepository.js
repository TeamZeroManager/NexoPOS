/** CashRepository (interfaz conceptual) — ver ProductRepository.js para el patrón. */
export class CashRepository {
  async getCurrent() {
    throw new Error('CashRepository.getCurrent no implementado');
  }
  async save(cashRegister) {
    throw new Error('CashRepository.save no implementado');
  }
  async update(id, changes) {
    throw new Error('CashRepository.update no implementado');
  }
}
