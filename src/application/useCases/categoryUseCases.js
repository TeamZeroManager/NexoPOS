import { createCategory } from '../../domain/entities/Category.js';
import { assertCategoryCanBeDeleted } from '../../domain/rules/categoryRules.js';

/**
 * categoryUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Orquestar CRUD de categorías, aplicando la regla de que no
 *   se puede eliminar una categoría con productos asociados
 *   (sección 20). La UI muestra el error, pero la regla vive
 *   fuera de la UI (categoryRules.js).
 */
export function makeCategoryUseCases({ categoryRepository, productRepository }) {
  return {
    async listCategories() {
      return categoryRepository.findAll();
    },

    async createCategory({ name }) {
      const category = createCategory({ name });
      return categoryRepository.save(category);
    },

    async renameCategory(id, name) {
      return categoryRepository.update(id, { name });
    },

    async deleteCategory(id) {
      const productCount = await productRepository.countByCategory(id);
      assertCategoryCanBeDeleted(productCount); // lanza ValidationError si hay productos
      return categoryRepository.delete(id);
    },
  };
}
