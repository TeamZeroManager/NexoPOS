import { CustomerRepository } from '../../domain/repositories/CustomerRepository.js';

const STORAGE_KEY = 'pos_pro_customers';

/**
 * LocalStorageCustomerRepository
 * ---------------------------------------------------------
 * Ver LocalStorageProductRepository.js para el patrón general.
 */
export class LocalStorageCustomerRepository extends CustomerRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async findById(id) {
    const customers = await this.findAll();
    return customers.find((c) => c.id === id) ?? null;
  }

  async save(customer) {
    const customers = await this.findAll();
    customers.push(customer);
    this.storage.set(STORAGE_KEY, customers);
    return customer;
  }

  async update(id, changes) {
    const customers = await this.findAll();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) return null;
    customers[index] = { ...customers[index], ...changes };
    this.storage.set(STORAGE_KEY, customers);
    return customers[index];
  }
}
