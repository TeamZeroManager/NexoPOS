import { HeldSaleRepository } from '../../domain/repositories/HeldSaleRepository.js';

const STORAGE_KEY = 'pos_pro_held_sales';

/**
 * LocalStorageHeldSaleRepository
 * ---------------------------------------------------------
 * Ver LocalStorageProductRepository.js para el patrón general.
 */
export class LocalStorageHeldSaleRepository extends HeldSaleRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async findById(id) {
    const all = await this.findAll();
    return all.find((h) => h.id === id) ?? null;
  }

  async save(heldSale) {
    const all = await this.findAll();
    all.push(heldSale);
    this.storage.set(STORAGE_KEY, all);
    return heldSale;
  }

  async delete(id) {
    const all = await this.findAll();
    this.storage.set(STORAGE_KEY, all.filter((h) => h.id !== id));
  }
}
