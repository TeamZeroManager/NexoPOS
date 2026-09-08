/**
 * toast.js
 * ---------------------------------------------------------
 * Responsabilidad: mostrar mensajes breves de feedback (éxito o
 * error) sin usar alert() (sección 45). Solo sabe pintar texto;
 * no decide reglas de negocio.
 */
let hideTimeout = null;

export function showToast(message, variant = 'default') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.background =
    variant === 'danger' ? 'var(--color-danger)' : variant === 'success' ? 'var(--color-success)' : 'var(--color-ink)';
  toast.style.display = 'block';

  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}
