/**
 * businessUseCases
 * ---------------------------------------------------------
 * Responsabilidad: consultas simples sobre el negocio configurado.
 * La creación vive en setupUseCases (solo ocurre una vez).
 */
export function makeBusinessUseCases({ businessRepository }) {
  return {
    async getCurrent() {
      return businessRepository.getCurrent();
    },
  };
}
