import { CashRepository } from '../../domain/repositories/CashRepository.js';

const STORAGE_KEY = 'pos_pro_cash_registers';

/**
 * LocalStorageCashRepository
 * ---------------------------------------------------------
 * Guarda el historial completo de aperturas/cierres de caja
 * (nunca se sobrescribe, solo se agregan registros — sección 39:
 * trazabilidad). getCurrent() devuelve la caja abierta, si existe.
 */
export class LocalStorageCashRepository extends CashRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async getCurrent() {
    const all = await this.findAll();
    return all.find((c) => c.status === 'OPEN') ?? null;
  }

  async save(cashRegister) {
    const all = await this.findAll();
    all.push(cashRegister);
    this.storage.set(STORAGE_KEY, all);
    return cashRegister;
  }

  async update(id, changes) {
    const all = await this.findAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) return null;
    all[index] = { ...all[index], ...changes };
    this.storage.set(STORAGE_KEY, all);
    return all[index];
  }
}
