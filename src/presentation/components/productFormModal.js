import { openModal, closeAllModals } from './modal.js';
import { showToast } from './toast.js';

/**
 * Formulario de creación de productos.
 * La imagen puede seleccionarse desde el dispositivo; se comprime
 * antes de guardarla para evitar llenar localStorage rápidamente.
 */
export function openProductFormModal({ productUseCases, categoryUseCases, categories, onSaved }) {
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
      Stock inicial
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

    <label class="product-image-upload">
      <span style="font-size:0.875rem;">Foto del producto (opcional)</span>
      <input name="imageFile" type="file" accept="image/*" class="product-image-upload__input">
      <span class="product-image-upload__hint">Selecciona una foto desde el PC o celular. Se optimizará automáticamente.</span>
      <img class="product-image-upload__preview" alt="Vista previa" hidden>
    </label>

    <label style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;">
      O usar URL de imagen (opcional)
      <input class="search-input" name="image" placeholder="https://...">
    </label>
  `;

  const categorySelect = form.querySelector('select[name="categoryId"]');
  const imageInput = form.querySelector('input[name="imageFile"]');
  const imageUrlInput = form.querySelector('input[name="image"]');
  const preview = form.querySelector('.product-image-upload__preview');
  let selectedImage = null;

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

  imageInput.addEventListener('change', async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      imageInput.value = '';
      showToast('Selecciona un archivo de imagen válido', 'danger');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      imageInput.value = '';
      showToast('La imagen debe pesar máximo 8 MB', 'danger');
      return;
    }

    try {
      selectedImage = await optimizeImage(file);
      preview.src = selectedImage;
      preview.hidden = false;
      imageUrlInput.value = '';
      showToast('Foto cargada', 'success');
    } catch (error) {
      selectedImage = null;
      imageInput.value = '';
      preview.hidden = true;
      showToast(error.message || 'No se pudo procesar la imagen', 'danger');
    }
  });

  imageUrlInput.addEventListener('input', () => {
    if (imageUrlInput.value.trim()) {
      selectedImage = null;
      imageInput.value = '';
      preview.hidden = true;
    }
  });

  openModal({
    id: 'product-form',
    title: 'Crear producto',
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
            await productUseCases.createProduct({
              name: data.get('name').trim(),
              price: Number(data.get('price')),
              stock: Number(data.get('stock')),
              categoryId: data.get('categoryId'),
              sku: data.get('sku')?.trim() || null,
              image: selectedImage || data.get('image')?.trim() || null,
            });
            closeAllModals();
            showToast('Producto creado', 'success');
            onSaved?.();
          } catch (error) {
            showToast(error.message, 'danger');
          }
        },
      },
    ],
  });
}

function optimizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('No se pudo procesar la imagen'));
      image.onload = () => {
        const maxSize = 800;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
