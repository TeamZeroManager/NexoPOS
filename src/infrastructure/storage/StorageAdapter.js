/**
 * StorageAdapter
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Ser el ÚNICO punto del proyecto que llama directamente a
 *   localStorage.setItem/getItem (sección 35). Ningún repositorio
 *   ni caso de uso debe tocar localStorage directamente.
 *
 * Entradas/Salidas:
 *   get(key)        -> array u objeto deserializado (o [] por defecto)
 *   set(key, value) -> void
 *   remove(key)     -> void
 *
 * Dependencias:
 *   window.localStorage (navegador). Cuando se migre a API, esta
 *   clase completa se reemplaza por un HttpClient equivalente sin
 *   tocar los repositorios que la usan (solo su implementación interna).
 */
export class StorageAdapter {
  get(key, defaultValue = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (error) {
      console.error(`StorageAdapter.get error en key "${key}":`, error);
      return defaultValue;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`StorageAdapter.set error en key "${key}":`, error);
      throw error;
    }
  }

  remove(key) {
    localStorage.removeItem(key);
  }
}
