/** HeldSaleRepository (interfaz conceptual) — ver ProductRepository.js para el patrón. */
export class HeldSaleRepository {
  async findAll() {
    throw new Error('HeldSaleRepository.findAll no implementado');
  }
  async save(heldSale) {
    throw new Error('HeldSaleRepository.save no implementado');
  }
  async delete(id) {
    throw new Error('HeldSaleRepository.delete no implementado');
  }
}
