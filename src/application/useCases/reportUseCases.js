import { ValidationError } from '../../shared/errors/ValidationError.js';

const DAY = 86400000;

/** 'YYYY-MM-DD' (hora local) -> Date a las 00:00 local. */
function parseLocalDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) throw new ValidationError('Fecha inválida', 'date');
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function makeReportUseCases({ reportRepository }) {
  return {
    /** Rango inclusivo en días: from..to se convierte a [from 00:00, to+1 00:00). */
    async getSalesReport({ from, to }) {
      const start = parseLocalDate(from);
      const end = parseLocalDate(to);
      if (end < start) throw new ValidationError('La fecha final no puede ser anterior a la inicial', 'to');
      if ((end - start) / DAY > 366) throw new ValidationError('El rango máximo es de un año', 'to');
      const endExclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      return reportRepository.salesReport({ fromIso: start.toISOString(), toIso: endExclusive.toISOString() });
    },
  };
}
