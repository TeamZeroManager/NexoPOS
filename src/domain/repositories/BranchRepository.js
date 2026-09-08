/** BranchRepository (interfaz conceptual) — ver ProductRepository.js para el patrón. */
export class BranchRepository {
  async findAll() {
    throw new Error('BranchRepository.findAll no implementado');
  }
  async save(branch) {
    throw new Error('BranchRepository.save no implementado');
  }
}
