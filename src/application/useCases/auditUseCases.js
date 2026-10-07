/** Consulta de la bitácora (solo lectura) y cálculo de diferencias para mostrar qué cambió. */
export function makeAuditUseCases({ auditRepository }) {
  const IGNORED = new Set(['updated_at']);
  return {
    list: (filters) => auditRepository.find(filters),
    /** Campos que cambiaron entre antes y después: [{ field, before, after }]. */
    diff(before, after) {
      const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
      return [...keys]
        .filter((k) => !IGNORED.has(k) && JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]))
        .map((field) => ({ field, before: before?.[field], after: after?.[field] }));
    },
  };
}
