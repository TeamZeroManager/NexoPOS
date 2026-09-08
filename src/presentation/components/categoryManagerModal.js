import { openModal, closeAllModals } from './modal.js';
import { confirmDialog } from './confirmDialog.js';
import { showToast } from './toast.js';

/**
 * openCategoryManagerModal
 * ---------------------------------------------------------
 * Responsabilidad: listar categorías con acciones de renombrar
 * y eliminar, más un formulario para crear una nueva (sección 20).
 * La regla "no eliminar categoría con productos" vive en el
 * dominio (categoryRules.js) y se ejecuta dentro del caso de uso;
 * aquí solo se atrapa el error y se muestra con Toast.
 */
export async function openCategoryManagerModal({ categoryUseCases, onChanged }) {
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';
  body.style.maxHeight = '50vh';
  body.style.overflowY = 'auto';

  async function render() {
    const categories = await categoryUseCases.listCategories();
    body.innerHTML = '';

    if (categories.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = 'var(--color-ink-muted)';
      empty.style.fontSize = '0.875rem';
      empty.textContent = 'Todavía no hay categorías.';
      body.appendChild(empty);
    }

    categories.forEach((category) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.padding = '4px 0';

      const nameInput = document.createElement('input');
      nameInput.className = 'search-input';
      nameInput.style.height = '36px';
      nameInput.style.flex = '1';
      nameInput.style.minWidth = '0';
      nameInput.value = category.name;

      const renameBtn = document.createElement('button');
      renameBtn.className = 'btn btn--secondary';
      renameBtn.style.height = '36px';
      renameBtn.style.flexShrink = '0';
      renameBtn.textContent = 'Renombrar';
      renameBtn.addEventListener('click', async () => {
        const newName = nameInput.value.trim();
        if (!newName || newName === category.name) return;
        await categoryUseCases.renameCategory(category.id, newName);
        showToast('Categoría renombrada', 'success');
        onChanged?.();
        render();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn--ghost';
      deleteBtn.style.height = '36px';
      deleteBtn.style.flexShrink = '0';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
          title: 'Eliminar categoría',
          message: `¿Eliminar "${category.name}"? Esta acción no se puede deshacer.`,
          confirmLabel: 'Eliminar',
        });
        if (!confirmed) return;
        try {
          await categoryUseCases.deleteCategory(category.id);
          showToast('Categoría eliminada', 'success');
          onChanged?.();
          render();
        } catch (error) {
          // p.ej. "No se puede eliminar una categoría con productos asociados"
          showToast(error.message, 'danger');
        }
      });

      row.append(nameInput, renameBtn, deleteBtn);
      body.appendChild(row);
    });

    const createRow = document.createElement('div');
    createRow.style.display = 'flex';
    createRow.style.gap = '8px';
    createRow.style.marginTop = '8px';

    const createInput = document.createElement('input');
    createInput.className = 'search-input';
    createInput.placeholder = 'Nueva categoría';

    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn--primary';
    createBtn.textContent = '+ Crear';
    createBtn.addEventListener('click', async () => {
      const name = createInput.value.trim();
      if (!name) return;
      try {
        await categoryUseCases.createCategory({ name });
        showToast('Categoría creada', 'success');
        onChanged?.();
        render();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });

    createRow.append(createInput, createBtn);
    body.appendChild(createRow);
  }

  await render();

  openModal({
    id: 'category-manager',
    title: 'Categorías',
    bodyNode: body,
    actions: [{ label: 'Cerrar', variant: 'primary', onClick: closeAllModals }],
  });
}
