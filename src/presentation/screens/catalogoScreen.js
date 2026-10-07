import { formatCurrency } from '../../shared/utils/format.js';
import { openProductFormModal } from '../components/productFormModal.js';
import { openCategoryManagerModal } from '../components/categoryManagerModal.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { showToast } from '../components/toast.js';
import { safeImageUrl } from '../../shared/utils/escape.js';

/**
 * makeCatalogoScreen
 * ---------------------------------------------------------
 * Responsabilidad: vista completa del catálogo (activos e
 * inactivos) con búsqueda, filtro por categoría y acciones de
 * editar / activar-desactivar / eliminar. Toda la escritura pasa
 * por productUseCases; aquí solo se pinta y se delegan eventos.
 * Los datos de usuario se insertan con textContent (nunca HTML).
 */
export function makeCatalogoScreen({ productUseCases, categoryUseCases }) {
  const container = document.getElementById('pageCatalogo');
  const state = { term: '', categoryId: '', showInactive: true, products: [], categories: [] };

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    node.append(...children);
    return node;
  }

  async function load() {
    [state.products, state.categories] = await Promise.all([
      productUseCases.listProducts(),
      categoryUseCases.listCategories(),
    ]);
  }

  function filtered() {
    const term = state.term.trim().toLowerCase();
    return state.products.filter((p) => {
      if (!state.showInactive && !p.active) return false;
      if (state.categoryId && p.categoryId !== state.categoryId) return false;
      return !term || p.name.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
    });
  }

  async function reload() {
    await load();
    renderBody();
  }

  async function onDelete(product) {
    const ok = await confirmDialog({
      title: 'Eliminar producto',
      message: `¿Eliminar "${product.name}" definitivamente? Si tiene ventas registradas no se podrá borrar; en ese caso desactívalo.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await productUseCases.deleteProduct(product.id);
      showToast('Producto eliminado', 'success');
      await reload();
    } catch (error) {
      // 23503 = violación de llave foránea: el producto ya tiene historial.
      const msg = error?.code === '23503'
        ? 'Este producto tiene ventas o movimientos registrados. Desactívalo en vez de eliminarlo.'
        : error.message;
      showToast(msg, 'danger');
    }
  }

  async function onToggle(product) {
    try {
      if (product.active) await productUseCases.deactivateProduct(product.id);
      else await productUseCases.activateProduct(product.id);
      showToast(product.active ? 'Producto desactivado' : 'Producto activado', 'success');
      await reload();
    } catch (error) {
      showToast(error.message, 'danger');
    }
  }

  function openForm(product = null) {
    openProductFormModal({ productUseCases, categoryUseCases, categories: state.categories, product, onSaved: reload });
  }

  function renderBody() {
    const body = container.querySelector('#catalogoBody');
    const summary = container.querySelector('#catalogoSummary');
    const categoryName = Object.fromEntries(state.categories.map((c) => [c.id, c.name]));
    const rows = filtered();

    const active = state.products.filter((p) => p.active);
    const lowStock = active.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const outOfStock = active.filter((p) => p.stock <= 0).length;
    summary.textContent = `${active.length} activos · ${state.products.length - active.length} inactivos · ${lowStock} con stock bajo · ${outOfStock} sin stock`;

    body.replaceChildren();
    if (rows.length === 0) {
      body.append(el('tr', {}, [el('td', { colSpan: 7, textContent: 'No hay productos que coincidan.' })]));
      return;
    }

    rows.forEach((p) => {
      const thumb = el('td');
      if (safeImageUrl(p.image)) {
        const img = el('img', { alt: '', loading: 'lazy' });
        img.src = safeImageUrl(p.image); // propiedad (no HTML) + esquema permitido
        img.style.cssText = 'width:36px;height:36px;object-fit:cover;border-radius:6px;';
        thumb.append(img);
      }

      const badge = el('span', { className: `badge ${p.active ? 'badge--success' : 'badge--danger'}`, textContent: p.active ? 'Activo' : 'Inactivo' });
      const stockCell = el('td', { textContent: String(p.stock) });
      if (p.stock <= 0) stockCell.style.color = 'var(--color-danger, #c0392b)';

      const actions = el('td');
      actions.style.whiteSpace = 'nowrap';
      [
        ['Editar', () => openForm(p)],
        [p.active ? 'Desactivar' : 'Activar', () => onToggle(p)],
        ['Eliminar', () => onDelete(p)],
      ].forEach(([label, handler]) => {
        const btn = el('button', { type: 'button', className: 'btn btn--secondary', textContent: label });
        btn.style.marginRight = '6px';
        btn.addEventListener('click', handler);
        actions.append(btn);
      });

      body.append(
        el('tr', {}, [
          thumb,
          el('td', { textContent: p.name }),
          el('td', { textContent: p.sku ?? '—' }),
          el('td', { textContent: categoryName[p.categoryId] ?? '—' }),
          el('td', { textContent: formatCurrency(p.price) }),
          stockCell,
          el('td', {}, [badge]),
          actions,
        ])
      );
    });
  }

  function renderShell() {
    container.innerHTML = `
      <div class="card-section">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;">
          <input class="search-input" id="catalogoSearch" placeholder="Buscar por nombre o SKU" style="flex:1;min-width:180px;">
          <select class="search-input" id="catalogoCategory" style="max-width:200px;"></select>
          <label style="display:flex;gap:6px;align-items:center;font-size:0.875rem;">
            <input type="checkbox" id="catalogoInactive" checked> Ver inactivos
          </label>
          <button type="button" class="btn btn--secondary" id="catalogoCategories">Categorías</button>
          <button type="button" class="btn btn--primary" id="catalogoNew">+ Nuevo producto</button>
        </div>
        <div id="catalogoSummary" style="font-size:0.875rem;color:var(--color-ink-muted);margin-bottom:8px;"></div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr><th></th><th>Producto</th><th>SKU</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
            <tbody id="catalogoBody"></tbody>
          </table>
        </div>
      </div>
    `;

    const select = container.querySelector('#catalogoCategory');
    select.append(el('option', { value: '', textContent: 'Todas las categorías' }));
    state.categories.forEach((c) => select.append(el('option', { value: c.id, textContent: c.name })));

    container.querySelector('#catalogoSearch').addEventListener('input', (e) => { state.term = e.target.value; renderBody(); });
    select.addEventListener('change', (e) => { state.categoryId = e.target.value; renderBody(); });
    container.querySelector('#catalogoInactive').addEventListener('change', (e) => { state.showInactive = e.target.checked; renderBody(); });
    container.querySelector('#catalogoNew').addEventListener('click', () => openForm());
    container.querySelector('#catalogoCategories').addEventListener('click', () =>
      openCategoryManagerModal({ categoryUseCases, onChanged: async () => { await load(); renderShell(); renderBody(); } })
    );
  }

  return {
    async render() {
      await load();
      renderShell();
      renderBody();
    },
  };
}
