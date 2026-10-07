import { openModal, closeAllModals } from './modal.js';
import { showToast } from './toast.js';
import { escapeHtml } from '../../shared/utils/escape.js';

/**
 * openProductFormModal
 * ---------------------------------------------------------
 * Responsabilidad: recolectar los campos del formulario (sección 19)
 * y delegar la creación al caso de uso. Este archivo NO valida
 * reglas de negocio (precio >= 0, nombre requerido, etc.) — eso
 * ya lo hace `createProduct()` en el dominio. Aquí solo se atrapa
 * el ValidationError para mostrarlo con Toast en vez de alert().
 *
 * Dependencias:
 *   productUseCases.createProduct, categoryUseCases (listar/crear)
 */
export function openProductFormModal({ productUseCases, categoryUseCases, categories, onSaved, product = null }) {
  const isEdit = Boolean(product);
  const form = document.createElement('form');
  form.className = 'product-form';
  form.style.display = 'flex';
  form.style.flexDirection = 'column';
  form.style.gap = '12px';

  form.innerHTML = `
    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
      Nombre
      <input class="search-input" name="name" required placeholder="Ej: Coca-Cola 350ml">
    </label>

    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
      Precio (COP)
      <input class="search-input" name="price" type="number" min="0" step="1" required placeholder="Ej: 2800">
    </label>

    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
      ${isEdit ? 'Stock (se ajusta desde Inventario)' : 'Stock inicial'}
      <input class="search-input" name="stock" type="number" min="0" step="1" required placeholder="Ej: 20">
    </label>

    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
      Categoría
      <select class="search-input" name="categoryId" required>
        <option value="" disabled selected>Selecciona una categoría</option>
        ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </label>

    <div style="display:flex;gap:8px;align-items:flex-end;">
      <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;flex:1;">
        Nueva categoría
        <input class="search-input" name="newCategoryName" placeholder="Ej: Snacks">
      </label>
      <button type="button" class="btn btn--secondary" id="btnAddCategoryInline">+ Agregar</button>
    </div>

    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
      SKU (opcional)
      <input class="search-input" name="sku" placeholder="Ej: BEB-001">
    </label>

    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
      Imagen (URL opcional)
      <input class="search-input" name="image" placeholder="https://...">
    </label>
  `;

  const categorySelect = form.querySelector('select[name="categoryId"]');

  if (isEdit) {
    form.elements.name.value = product.name;
    form.elements.price.value = product.price;
    form.elements.stock.value = product.stock;
    form.elements.stock.readOnly = true;
    form.elements.stock.title = 'El stock se ajusta desde Inventario para dejar trazabilidad';
    form.elements.categoryId.value = product.categoryId;
    form.elements.sku.value = product.sku ?? '';
    form.elements.image.value = product.image ?? '';
  }

  form.querySelector('#btnAddCategoryInline').addEventListener('click', async () => {
    const input = form.querySelector('input[name="newCategoryName"]');
    const name = input.value.trim();
    if (!name) return;
    try {
      const category = await categoryUseCases.createCategory({ name });
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
      categorySelect.value = category.id;
      input.value = '';
      showToast(`Categoría "${category.name}" creada`, 'success');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  openModal({
    id: 'product-form',
    title: isEdit ? 'Editar producto' : 'Crear producto',
    bodyNode: form,
    actions: [
      { label: 'Cancelar', variant: 'secondary', onClick: closeAllModals },
      {
        label: 'Guardar',
        variant: 'primary',
        onClick: async () => {
          if (!form.reportValidity()) return;
          const data = new FormData(form);
          try {
            const payload = {
              name: data.get('name').trim(),
              price: Number(data.get('price')),
              stock: Number(data.get('stock')),
              categoryId: data.get('categoryId'),
              sku: data.get('sku')?.trim() || null,
              image: data.get('image')?.trim() || null,
            };
            if (isEdit) {
              delete payload.stock; // el stock solo cambia vía Inventario / ventas / compras
              await productUseCases.updateProduct(product.id, payload);
            }
            else await productUseCases.createProduct(payload);
            closeAllModals();
            showToast(isEdit ? 'Producto actualizado' : 'Producto creado', 'success');
            onSaved?.();
          } catch (error) {
            showToast(error.message, 'danger');
          }
        },
      },
    ],
  });
}

