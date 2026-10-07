import { ValidationError } from '../../shared/errors/ValidationError.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(input) {
  const out = {};
  for (const k of ['name', 'nit', 'contact', 'phone', 'email', 'address']) {
    if (k in input) out[k] = (input[k] ?? '').toString().trim() || null;
  }
  if ('name' in out && !out.name) throw new ValidationError('El proveedor requiere un nombre', 'name');
  if (out.email && !EMAIL.test(out.email)) throw new ValidationError('El correo no es válido', 'email');
  return out;
}

export function makeSupplierUseCases({ supplierRepository }) {
  return {
    list: () => supplierRepository.findAll(),
    async create(input) {
      const data = clean(input);
      if (!data.name) throw new ValidationError('El proveedor requiere un nombre', 'name');
      return supplierRepository.save({ ...data, active: true });
    },
    async update(id, input) {
      return supplierRepository.update(id, clean(input));
    },
    setActive: (id, active) => supplierRepository.update(id, { active }),
  };
}
