import { BranchRepository } from '../../domain/repositories/BranchRepository.js';

const STORAGE_KEY = 'pos_pro_branches';

export class LocalStorageBranchRepository extends BranchRepository {
  constructor(storageAdapter) {
    super();
    this.storage = storageAdapter;
  }

  async findAll() {
    return this.storage.get(STORAGE_KEY, []);
  }

  async save(branch) {
    const branches = await this.findAll();
    branches.push(branch);
    this.storage.set(STORAGE_KEY, branches);
    return branch;
  }
}
