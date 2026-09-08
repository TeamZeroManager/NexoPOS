/**
 * modal.js
 * ---------------------------------------------------------
 * Responsabilidad: montar/desmontar modales genéricos (Modal /
 * ConfirmDialog de la sección 42). Recibe nodos ya construidos;
 * no sabe qué formulario o confirmación se le está mostrando.
 *
 * Los modales se apilan (LIFO): abrir un ConfirmDialog sobre un
 * modal ya abierto (ej: confirmar "Eliminar categoría" desde el
 * gestor de categorías) no destruye el modal de fondo. closeModal()
 * cierra únicamente el modal más reciente; closeAllModals() cierra
 * todo de una vez (lo usan los botones "Cancelar"/"Cerrar" de los
 * modales principales, para que un solo clic baste siempre, sin
 * importar si quedó algo apilado por accidente).
 *
 * `id` (opcional) evita abrir el MISMO modal dos veces seguidas —
 * por ejemplo, si el usuario hace doble clic en "+ Crear producto"
 * antes de que el primero termine de renderizarse.
 */
const modalStack = []; // { id, overlay }

export function openModal({ id = null, title, bodyNode, actions = [] }) {
  if (id && modalStack.some((entry) => entry.id === id)) {
    return; // ya hay uno de estos abierto — no duplicar
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const titleEl = document.createElement('h2');
  titleEl.className = 'modal__title';
  titleEl.textContent = title;

  const actionsEl = document.createElement('div');
  actionsEl.className = 'modal__actions';
  actions.forEach(({ label, variant = 'secondary', onClick }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn btn--${variant}`;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    actionsEl.appendChild(btn);
  });

  modal.append(titleEl, bodyNode, actionsEl);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
  modalStack.push({ id, overlay });
}

/** Cierra únicamente el modal más reciente (comportamiento de pila). */
export function closeModal() {
  const entry = modalStack.pop();
  entry?.overlay.remove();
}

/** Cierra TODOS los modales abiertos de una sola vez. */
export function closeAllModals() {
  while (modalStack.length > 0) {
    modalStack.pop().overlay.remove();
  }
}
