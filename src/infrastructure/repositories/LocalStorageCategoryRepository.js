import { CategoryRepository } from '../../domain/repositories/CategoryRepository.js';

const STORAGE_KEY = 'pos_pro_categories';

/**
 * LocalStorageCategoryRepository
 * ---------------------------------------------------------
 * Ver LocalStorageProductRepository.js para el patrón general:
 * este repositorio es la única pieza que sabrá reemplazarse por
 * ApiCategoryRepository el día que exista backend.
 */
export class LocalStorageCategoryRepository extends CategoryRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async findById(id) {
    const categories = await this.findAll();
    return categories.find((c) => c.id === id) ?? null;
  }

  async save(category) {
    const categories = await this.findAll();
    categories.push(category);
    this.storage.set(STORAGE_KEY, categories);
    return category;
  }

  async update(id, changes) {
    const categories = await this.findAll();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return null;
    categories[index] = { ...categories[index], ...changes };
    this.storage.set(STORAGE_KEY, categories);
    return categories[index];
  }

  async delete(id) {
    const categories = await this.findAll();
    this.storage.set(STORAGE_KEY, categories.filter((c) => c.id !== id));
  }
}
