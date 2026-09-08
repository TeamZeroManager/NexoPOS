import { ProductRepository } from '../../domain/repositories/ProductRepository.js';
import { nowIso } from '../../shared/utils/format.js';

const STORAGE_KEY = 'pos_pro_products';

/**
 * LocalStorageProductRepository
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Implementar ProductRepository usando StorageAdapter como
 *   única puerta a localStorage.
 *
 * Ejemplo de migración futura (sección 36):
 *   findAll() hoy lee de localStorage; mañana un
 *   ApiProductRepository hará `fetch('/api/products')` con la
 *   MISMA firma, y ningún caso de uso deberá cambiar.
 */
export class LocalStorageProductRepository extends ProductRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async findById(id) {
    const products = await this.findAll();
    return products.find((p) => p.id === id) ?? null;
  }

  async findByCategory(categoryId) {
    const products = await this.findAll();
    return products.filter((p) => p.categoryId === categoryId);
  }

  async countByCategory(categoryId) {
    const products = await this.findByCategory(categoryId);
    return products.length;
  }

  async save(product) {
    const products = await this.findAll();
    products.push(product);
    this.storage.set(STORAGE_KEY, products);
    return product;
  }

  async update(id, changes) {
    const products = await this.findAll();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...changes, updatedAt: nowIso() };
    this.storage.set(STORAGE_KEY, products);
    return products[index];
  }

  async delete(id) {
    const products = await this.findAll();
    const filtered = products.filter((p) => p.id !== id);
    this.storage.set(STORAGE_KEY, filtered);
  }
}
