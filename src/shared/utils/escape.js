/**
 * escapeHtml
 * ---------------------------------------------------------
 * Escapa los 5 caracteres con significado en HTML, incluidas las
 * comillas: sin ellas, un valor insertado dentro de un atributo
 * (src="…", title="…") podía cerrar el atributo e inyectar
 * handlers como onerror=. Úsala SIEMPRE para texto de usuario
 * que se concatene en plantillas con innerHTML.
 */
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => MAP[ch]);
}

/**
 * safeImageUrl
 * Solo permite http(s) y data:image/*. Bloquea javascript:, data:text/html, etc.
 * Devuelve '' si la URL no es segura.
 */
export function safeImageUrl(value) {
  const url = String(value ?? '').trim();
  return /^(https?:\/\/|data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,)/i.test(url) ? url : '';
}
