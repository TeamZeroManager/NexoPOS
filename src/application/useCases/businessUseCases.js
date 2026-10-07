import { ValidationError } from '../../shared/errors/ValidationError.js';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function makeBusinessUseCases({ businessRepository }) {
  const opt = (v) => (v ?? '').toString().trim() || null;
  return {
    async getCurrent() {
      return businessRepository.getCurrent();
    },
    /** Valida datos del negocio y marca. Logo solo por https (evita javascript:/data: y contenido mixto). */
    async update(input) {
      const name = (input.name ?? '').trim();
      if (!name) throw new ValidationError('El negocio requiere un nombre', 'name');
      const email = opt(input.email);
      if (email && !EMAIL.test(email)) throw new ValidationError('El correo no es válido', 'email');
      const logoUrl = opt(input.logoUrl);
      if (logoUrl && !/^https:\/\/[^\s]+$/i.test(logoUrl)) throw new ValidationError('El logo debe ser una URL que empiece con https://', 'logoUrl');
      const primaryColor = opt(input.primaryColor);
      const secondaryColor = opt(input.secondaryColor);
      if (primaryColor && !HEX.test(primaryColor)) throw new ValidationError('Color primario inválido (usa #RRGGBB)', 'primaryColor');
      if (secondaryColor && !HEX.test(secondaryColor)) throw new ValidationError('Color secundario inválido (usa #RRGGBB)', 'secondaryColor');
      return businessRepository.update({
        name, nit: opt(input.nit), address: opt(input.address), phone: opt(input.phone), email,
        logoUrl, primaryColor, secondaryColor, receiptFooter: opt(input.receiptFooter),
      });
    },
  };
}
