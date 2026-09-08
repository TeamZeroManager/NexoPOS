const SESSION_KEY = 'pos_pro_session';

/**
 * SessionStore
 * ---------------------------------------------------------
 * Responsabilidad: recordar qué usuario tiene la sesión activa,
 * para no pedir login en cada recarga de la página. No es una
 * entidad de dominio (no tiene reglas de negocio), es un detalle
 * de infraestructura — por eso vive junto a StorageAdapter.
 */
export class SessionStore {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
  }

  get() {
    return this.storage.get(SESSION_KEY, null);
  }

  set(userId) {
    this.storage.set(SESSION_KEY, { userId, loggedInAt: new Date().toISOString() });
  }

  clear() {
    this.storage.remove(SESSION_KEY);
  }
}
