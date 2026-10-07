import { openModal, closeAllModals } from './modal.js';
import { showToast } from './toast.js';

/**
 * dom.js
 * ---------------------------------------------------------
 * Helpers de UI compartidos por los módulos nuevos. Todo texto
 * de usuario entra por textContent / propiedades (nunca como HTML),
 * así no hay inyección aunque un nombre contenga etiquetas.
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  const { style, dataset, ...rest } = props;
  Object.assign(node, rest);
  if (style) node.style.cssText = style;
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...[].concat(children).filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

export function badge(text, variant = 'pending') {
  return el('span', { className: `badge badge--${variant}`, textContent: text });
}

export function button(label, onClick, variant = 'secondary', extra = {}) {
  const btn = el('button', { type: 'button', className: `btn btn--${variant}`, textContent: label, ...extra });
  btn.addEventListener('click', onClick);
  return btn;
}

export function kpi(label, value, hint = '') {
  return el('div', { className: 'card-section', style: 'flex:1;min-width:150px;' }, [
    el('div', { textContent: label, style: 'font-size:0.8rem;color:var(--color-ink-muted);' }),
    el('div', { textContent: value, style: 'font-size:1.35rem;font-weight:700;margin-top:2px;' }),
    hint ? el('div', { textContent: hint, style: 'font-size:0.75rem;color:var(--color-ink-muted);margin-top:2px;' }) : null,
  ]);
}

/** Tabla simple: head = ['A','B'], rows = array de arrays de (string | Node). */
export function table(head, rows, emptyText = 'Sin registros.') {
  const tbody = el('tbody');
  if (rows.length === 0) tbody.append(el('tr', {}, [el('td', { colSpan: head.length, textContent: emptyText })]));
  rows.forEach((cells) =>
    tbody.append(el('tr', {}, cells.map((c) => el('td', {}, [typeof c === 'string' || typeof c === 'number' ? String(c) : c]))))
  );
  return el('div', { style: 'overflow-x:auto;' }, [
    el('table', { className: 'data-table' }, [el('thead', {}, [el('tr', {}, head.map((h) => el('th', { textContent: h })))]), tbody]),
  ]);
}

export function labeled(label, input, hint) {
  return el('label', { style: 'display:flex;flex-direction:column;gap:4px;font-size:0.875rem;' }, [
    label, input, hint ? el('small', { textContent: hint, style: 'color:var(--color-ink-muted);' }) : null,
  ]);
}

/**
 * formModal: modal con formulario declarativo.
 * fields: [{ name, label, type, required, placeholder, options:[{value,label}], value, min, step, hint, rows }]
 * onSubmit(values) -> Promise; si lanza, se muestra el mensaje en un Toast y el modal queda abierto.
 */
export function formModal({ id, title, fields, submitLabel = 'Guardar', onSubmit }) {
  const form = el('form', { style: 'display:flex;flex-direction:column;gap:12px;' });
  fields.forEach((f) => {
    let input;
    if (f.options) {
      input = el('select', { name: f.name, className: 'search-input', required: Boolean(f.required) },
        f.options.map((o) => el('option', { value: o.value, textContent: o.label })));
    } else if (f.type === 'textarea') {
      input = el('textarea', { name: f.name, className: 'search-input', rows: f.rows ?? 3, placeholder: f.placeholder ?? '' });
    } else {
      input = el('input', { name: f.name, className: 'search-input', type: f.type ?? 'text', required: Boolean(f.required), placeholder: f.placeholder ?? '' });
      if (f.min !== undefined) input.min = f.min;
      if (f.step !== undefined) input.step = f.step;
    }
    if (f.value !== undefined && f.value !== null) input.value = f.value;
    form.append(labeled(f.label, input, f.hint));
  });

  openModal({
    id, title, bodyNode: form,
    actions: [
      { label: 'Cancelar', variant: 'secondary', onClick: closeAllModals },
      {
        label: submitLabel, variant: 'primary',
        onClick: async () => {
          if (!form.reportValidity()) return;
          const values = {};
          fields.forEach((f) => {
            const raw = form.elements[f.name].value;
            values[f.name] = f.type === 'number' ? (raw === '' ? null : Number(raw)) : raw.trim();
          });
          try {
            await onSubmit(values);
            closeAllModals();
          } catch (error) {
            showToast(error.message, 'danger');
          }
        },
      },
    ],
  });
}
