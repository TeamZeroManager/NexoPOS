/** SaleRepository (interfaz conceptual) — ver ProductRepository.js para el patrón. */
export class SaleRepository {
  async findAll() {
    throw new Error('SaleRepository.findAll no implementado');
  }
  async findById(id) {
    throw new Error('SaleRepository.findById no implementado');
  }
  async findByCustomer(customerId) {
    throw new Error('SaleRepository.findByCustomer no implementado');
  }
  async save(sale) {
    throw new Error('SaleRepository.save no implementado');
  }
  async updateStatus(id, status) {
    throw new Error('SaleRepository.updateStatus no implementado');
  }
}
