import { ValidationError } from '../../shared/errors/ValidationError.js';

/**
 * canDeleteCategory
 * ---------------------------------------------------------
 * Sección 20: no permitir eliminar una categoría con productos
 * asociados. El caso de uso deleteCategory() consultará
 * ProductRepository.countByCategory(categoryId) y pasará ese
 * número aquí; esta función solo decide, no consulta datos.
 */
export function assertCategoryCanBeDeleted(productCountInCategory) {
  if (productCountInCategory > 0) {
    throw new ValidationError(
      'No se puede eliminar una categoría con productos asociados',
      'categoryId'
    );
  }
  return true;
}
