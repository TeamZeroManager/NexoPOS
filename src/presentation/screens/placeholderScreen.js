/**
 * renderPlaceholder
 * ---------------------------------------------------------
 * Responsabilidad: mostrar honestamente que un módulo del menú
 * todavía no está construido (sección 46: V2 en adelante), en vez
 * de simular algo que no funciona.
 */
export function renderPlaceholder(title, description) {
  const container = document.getElementById('pagePlaceholder');
  const box = document.createElement('div');
  box.className = 'empty-state';
  box.style.cssText = 'background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); min-height:300px;';
  const strong = document.createElement('strong');
  strong.textContent = title;
  const span = document.createElement('span');
  span.textContent = description;
  box.append(strong, span);
  container.replaceChildren(box);
}
