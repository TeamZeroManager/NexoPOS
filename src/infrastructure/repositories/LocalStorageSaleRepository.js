import { SaleRepository } from '../../domain/repositories/SaleRepository.js';

const STORAGE_KEY = 'pos_pro_sales';

/**
 * LocalStorageSaleRepository
 * ---------------------------------------------------------
 * Ver LocalStorageProductRepository.js para el patrón general.
 * Las ventas nunca se borran (sección 39): solo se guardan y,
 * como mucho, cambian de estado (updateStatus).
 */
export class LocalStorageSaleRepository extends SaleRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async findById(id) {
    const sales = await this.findAll();
    return sales.find((s) => s.id === id) ?? null;
  }

  async findByCustomer(customerId) {
    const sales = await this.findAll();
    return sales.filter((s) => s.customerId === customerId);
  }

  async save(sale) {
    const sales = await this.findAll();
    sales.push(sale);
    this.storage.set(STORAGE_KEY, sales);
    return sale;
  }

  async updateStatus(id, status) {
    const sales = await this.findAll();
    const index = sales.findIndex((s) => s.id === id);
    if (index === -1) return null;
    sales[index] = { ...sales[index], status };
    this.storage.set(STORAGE_KEY, sales);
    return sales[index];
  }
}
