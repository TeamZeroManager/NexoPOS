/**
 * renderPlaceholder
 * ---------------------------------------------------------
 * Responsabilidad: mostrar honestamente que un módulo del menú
 * todavía no está construido (sección 46: V2 en adelante), en vez
 * de simular algo que no funciona.
 */
export function renderPlaceholder(title, description) {
  const container = document.getElementById('pagePlaceholder');
  container.innerHTML = `
    <div class="empty-state" style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); min-height:300px;">
      <strong>${title}</strong>
      <span>${description}</span>
    </div>
  `;
}
