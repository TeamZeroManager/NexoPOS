import { formatCurrency } from '../../shared/utils/format.js';

/**
 * renderProductCard
 * ---------------------------------------------------------
 * Tarjeta de producto. La tarjeta mantiene la acción principal
 * de agregar al carrito y expone una acción secundaria para
 * eliminar (baja lógica) el producto.
 */
export function renderProductCard(product, { onSelect, onDelete } = {}) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = product.stock <= 0;

  card.innerHTML = `
    <div class="product-card__image-wrap">
      <div class="product-card__image">
        ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">` : 'Sin imagen'}
      </div>
      <button type="button" class="product-card__delete" title="Eliminar producto" aria-label="Eliminar ${escapeHtml(product.name)}">×</button>
    </div>
    <div class="product-card__body">
      <span class="product-card__name">${escapeHtml(product.name)}</span>
      <div class="product-card__footer">
        <span class="product-card__price">${formatCurrency(product.price)}</span>
        <span class="product-card__stock" data-low="${lowStock || outOfStock}">
          ${outOfStock ? 'Sin stock' : `${product.stock} und`}
        </span>
      </div>
      <button type="button" class="btn btn--secondary product-card__add">Agregar</button>
    </div>
  `;

  card.querySelector('.product-card__add').addEventListener('click', () => onSelect?.(product));
  card.querySelector('.product-card__delete').addEventListener('click', (event) => {
    event.stopPropagation();
    onDelete?.(product);
  });

  return card;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
