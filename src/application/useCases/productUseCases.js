import { createProduct } from '../../domain/entities/Product.js';
import { validateStock } from '../../domain/rules/stockRules.js';

/**
 * productUseCases
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Orquestar las operaciones sobre productos: validan con el
 *   dominio (createProduct ya valida) y persisten a través del
 *   repositorio inyectado. La UI SOLO debe llamar a estas
 *   funciones, nunca a productRepository directamente ni
 *   reimplementar estas reglas dentro de un botón.
 *
 * Entradas:
 *   { productRepository } - cualquier implementación de ProductRepository
 *
 * Dependencias:
 *   domain/entities/Product.js, domain/rules/stockRules.js
 */
export function makeProductUseCases({ productRepository }) {
  return {
    async listProducts() {
      return productRepository.findAll();
    },

    async searchProducts({ term = '', categoryId = null } = {}) {
      const all = await productRepository.findAll();
      const normalizedTerm = term.trim().toLowerCase();

      return all.filter((product) => {
        const matchesCategory = !categoryId || product.categoryId === categoryId;
        const matchesTerm =
          !normalizedTerm ||
          product.name.toLowerCase().includes(normalizedTerm) ||
          (product.sku && product.sku.toLowerCase().includes(normalizedTerm));
        return matchesCategory && matchesTerm && product.active;
      });
    },

    async createProduct(input) {
      const product = createProduct(input); // el dominio valida
      return productRepository.save(product);
    },

    async updateProduct(id, changes) {
      return productRepository.update(id, changes);
    },

    /** Baja lógica: nunca se borra físicamente un producto con historial. */
    async deactivateProduct(id) {
      return productRepository.update(id, { active: false });
    },

    async deleteProduct(id) {
      return productRepository.delete(id);
    },

    /** Guardia reutilizable antes de agregar al carrito (usada en Fase 4). */
    async assertAvailable(productId, requestedQuantity) {
      const product = await productRepository.findById(productId);
      validateStock(product.stock, requestedQuantity);
      return product;
    },
  };
}
