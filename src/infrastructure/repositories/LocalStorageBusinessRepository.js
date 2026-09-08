import { BusinessRepository } from '../../domain/repositories/BusinessRepository.js';

const STORAGE_KEY = 'pos_pro_business';

/**
 * LocalStorageBusinessRepository
 * ---------------------------------------------------------
 * Guarda un único negocio (hoy no es multi-tenant real). getCurrent()
 * es la forma en que el resto del sistema sabe si el setup inicial
 * ya se completó (sección "Configuración inicial").
 */
export class LocalStorageBusinessRepository extends BusinessRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async getCurrent() {
    const businesses = this.storage.get(STORAGE_KEY, []);
    return businesses[0] ?? null;
  }

  async save(business) {
    this.storage.set(STORAGE_KEY, [business]);
    return business;
  }
}
