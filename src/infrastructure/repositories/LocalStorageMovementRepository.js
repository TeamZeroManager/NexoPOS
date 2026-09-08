import { MovementRepository } from '../../domain/repositories/MovementRepository.js';

const STORAGE_KEY = 'pos_pro_movements';

/**
 * LocalStorageMovementRepository
 * ---------------------------------------------------------
 * Ver LocalStorageProductRepository.js para el patrón general.
 * Los movimientos nunca se editan ni se borran (trazabilidad,
 * sección 38): solo se agregan.
 */
export class LocalStorageMovementRepository extends MovementRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async findByDateRange(from, to) {
    const all = await this.findAll();
    return all.filter((m) => {
      const createdAt = new Date(m.createdAt).getTime();
      const fromOk = !from || createdAt >= new Date(from).getTime();
      const toOk = !to || createdAt <= new Date(to).getTime();
      return fromOk && toOk;
    });
  }

  async save(movement) {
    const all = await this.findAll();
    all.push(movement);
    this.storage.set(STORAGE_KEY, all);
    return movement;
  }
}
