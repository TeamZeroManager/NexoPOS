/**
 * renderCategoryChip
 * ---------------------------------------------------------
 * Responsabilidad: construir un botón de categoría (sección 20).
 * No sabe cómo se filtran los productos; solo notifica el clic.
 */
export function renderCategoryChip({ id, label, active, onClick }) {
  const chip = document.createElement('button');
  chip.className = 'category-chip';
  chip.type = 'button';
  chip.textContent = label;
  chip.setAttribute('aria-pressed', String(active));
  chip.dataset.categoryId = id ?? '';
  chip.addEventListener('click', () => onClick(id));
  return chip;
}
