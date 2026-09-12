import { renderProductCard } from '../components/productCard.js';
import { renderCategoryChip } from '../components/categoryChip.js';
import { renderEmptyState } from '../components/emptyState.js';
import { openProductFormModal } from '../components/productFormModal.js';
import { openCategoryManagerModal } from '../components/categoryManagerModal.js';
import { showToast } from '../components/toast.js';

/**
 * initPosScreen
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Conectar el HTML estático de la Fase 2 (#categoryBar,
 *   #productGrid, #searchInput, #btnCreateProduct,
 *   #btnManageCategories) con los casos de uso de productos y
 *   categorías. Mantiene un pequeño estado local de filtros
 *   (categoría activa + término de búsqueda) y vuelve a pedir
 *   los datos al repositorio cada vez que algo cambia — nada de
 *   lógica de negocio vive aquí, solo orquestación de UI.
 *
 * Dependencias:
 *   productUseCases, categoryUseCases (inyectados desde main.js)
 */
export function initPosScreen({ productUseCases, categoryUseCases, cartStore }) {
  const categoryBar = document.getElementById('categoryBar');
  const productGrid = document.getElementById('productGrid');
  const searchInput = document.getElementById('searchInput');
  const btnCreateProduct = document.getElementById('btnCreateProduct');
  const btnManageCategories = document.getElementById('btnManageCategories');

  const state = {
    activeCategoryId: null, // null = "Todas"
    term: '',
    categories: [],
  };

  async function refreshCategories() {
    state.categories = await categoryUseCases.listCategories();
    renderCategoryBar();
  }

  function renderCategoryBar() {
    categoryBar.innerHTML = '';

    categoryBar.appendChild(
      renderCategoryChip({
        id: null,
        label: 'Todas',
        active: state.activeCategoryId === null,
        onClick: (id) => {
          state.activeCategoryId = id;
          renderCategoryBar();
          refreshProductGrid();
        },
      })
    );

    state.categories.forEach((category) => {
      categoryBar.appendChild(
        renderCategoryChip({
          id: category.id,
          label: category.name,
          active: state.activeCategoryId === category.id,
          onClick: (id) => {
            state.activeCategoryId = id;
            renderCategoryBar();
            refreshProductGrid();
          },
        })
      );
    });
  }

  async function refreshProductGrid() {
    const products = await productUseCases.searchProducts({
      term: state.term,
      categoryId: state.activeCategoryId,
    });

    productGrid.innerHTML = '';

    if (products.length === 0) {
      productGrid.appendChild(
        renderEmptyState({
          title: state.term || state.activeCategoryId ? 'Sin resultados' : 'Aún no hay productos',
          description: state.term || state.activeCategoryId
            ? 'Prueba con otro término o categoría.'
            : 'Crea tu primer producto con el botón "+ Crear producto".',
        })
      );
      return;
    }

    products.forEach((product) => {
      productGrid.appendChild(
        renderProductCard(product, {
          onSelect: (p) => {
            try {
              cartStore.addItem(p, 1);
            } catch (error) {
              // p.ej. "Stock insuficiente" (validateStock)
              showToast(error.message, 'danger');
            }
          },
        })
      );
    });
  }

  searchInput.addEventListener('input', (event) => {
    state.term = event.target.value;
    refreshProductGrid();
  });

  btnCreateProduct.addEventListener('click', () => {
    openProductFormModal({
      productUseCases,
      categoryUseCases,
      categories: state.categories,
      onSaved: async () => {
        await refreshCategories();
        await refreshProductGrid();
      },
    });
  });

  btnManageCategories.addEventListener('click', () => {
    openCategoryManagerModal({
      categoryUseCases,
      onChanged: async () => {
        await refreshCategories();
        await refreshProductGrid();
      },
    });
  });

  // Carga inicial
  refreshCategories().then(refreshProductGrid);

  return { refreshProductGrid };
}
