import { formatCurrency } from '../../shared/utils/format.js';

/**
 * renderProductCard
 * ---------------------------------------------------------
 * Responsabilidad: construir el DOM de una tarjeta de producto
 * (sección 18). No decide qué pasa al hacer clic; recibe onSelect
 * como callback desde la pantalla que la usa.
 */
export function renderProductCard(product, { onSelect } = {}) {
  const card = document.createElement('button');
  card.className = 'product-card';
  card.type = 'button';

  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = product.stock <= 0;

  card.innerHTML = `
    <div class="product-card__image">
      ${product.image ? `<img src="${escapeHtml(product.image)}" alt="">` : 'Sin imagen'}
    </div>
    <div class="product-card__body">
      <span class="product-card__name">${escapeHtml(product.name)}</span>
      <div class="product-card__footer">
        <span class="product-card__price">${formatCurrency(product.price)}</span>
        <span class="product-card__stock" data-low="${lowStock || outOfStock}">
          ${outOfStock ? 'Sin stock' : `${product.stock} und`}
        </span>
      </div>
    </div>
  `;

  card.addEventListener('click', () => onSelect?.(product));
  return card;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
