/**
 * renderEmptyState
 * ---------------------------------------------------------
 * Responsabilidad: mostrar un mensaje cuando no hay productos
 * que mostrar (sin resultados de búsqueda, o catálogo vacío).
 * Sección: "Tratar el vacío como una invitación a actuar."
 */
export function renderEmptyState({ title, description }) {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML = `
    <strong>${title}</strong>
    <span>${description}</span>
  `;
  return el;
}
