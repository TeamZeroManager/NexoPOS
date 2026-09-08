/**
 * ProductRepository (interfaz conceptual)
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Definir el CONTRATO que cualquier fuente de datos de productos
 *   debe cumplir. El dominio y los casos de uso dependen de ESTA
 *   interfaz, nunca de LocalStorage o de una API directamente
 *   (sección 8-9).
 *
 * Implementaciones actuales/futuras:
 *   LocalStorageProductRepository (hoy)
 *   ApiProductRepository (futuro)
 *   PostgresProductRepository (futuro backend)
 *
 * Si una subclase no implementa un método, debe lanzar el error
 * de "método no implementado" que se ve abajo, para detectarlo
 * temprano en desarrollo.
 */
export class ProductRepository {
  async findAll() {
    throw new Error('ProductRepository.findAll no implementado');
  }
  async findById(id) {
    throw new Error('ProductRepository.findById no implementado');
  }
  async findByCategory(categoryId) {
    throw new Error('ProductRepository.findByCategory no implementado');
  }
  async countByCategory(categoryId) {
    throw new Error('ProductRepository.countByCategory no implementado');
  }
  async save(product) {
    throw new Error('ProductRepository.save no implementado');
  }
  async update(id, changes) {
    throw new Error('ProductRepository.update no implementado');
  }
  async delete(id) {
    throw new Error('ProductRepository.delete no implementado');
  }
}
