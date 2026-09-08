import { openModal, closeAllModals } from './modal.js';
import { confirmDialog } from './confirmDialog.js';
import { showToast } from './toast.js';
import { formatCurrency, formatDate } from '../../shared/utils/format.js';
import { calculateSaleSubtotal, calculateSaleDiscount, calculateSaleTotal } from '../../domain/calculations/saleCalculations.js';

/**
 * openHeldSalesModal
 * ---------------------------------------------------------
 * Responsabilidad: listar las ventas en espera (sección 23),
 * permitiendo retomarlas o eliminarlas.
 *
 * Regla importante:
 *   Si el carrito activo ya tiene productos, se pregunta antes
 *   de reemplazarlo (sección 23: "Si existe un carrito activo:
 *   preguntar antes de reemplazarlo").
 */
export async function openHeldSalesModal({ heldSaleUseCases, cartStore, onChanged }) {
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '8px';
  body.style.maxHeight = '55vh';
  body.style.overflowY = 'auto';

  async function render() {
    const heldSales = await heldSaleUseCases.listHeldSales();
    body.innerHTML = '';

    if (heldSales.length === 0) {
      const empty = document.createElement('p');
      empty.style.color = 'var(--color-ink-muted)';
      empty.style.fontSize = '0.875rem';
      empty.textContent = 'No hay ventas en espera.';
      body.appendChild(empty);
      return;
    }

    heldSales.forEach((heldSale) => {
      const subtotal = calculateSaleSubtotal(heldSale.items);
      const discount = calculateSaleDiscount(heldSale.items);
      const total = calculateSaleTotal(subtotal, discount);

      const row = document.createElement('div');
      row.className = 'customer-card';
      row.style.flexWrap = 'wrap';
      row.style.rowGap = '8px';
      row.style.columnGap = '12px';

      const info = document.createElement('div');
      info.style.minWidth = '140px';
      info.innerHTML = `
        <div style="font-weight:600;">${escapeHtml(heldSale.name)}</div>
        <div style="font-size:0.75rem; color:var(--color-ink-muted);">
          ${heldSale.items.length} producto(s) · ${formatDate(heldSale.createdAt)}
        </div>
      `;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.alignItems = 'center';
      actions.style.gap = '8px';

      const totalLabel = document.createElement('span');
      totalLabel.className = 'customer-card__debt';
      totalLabel.textContent = formatCurrency(total);

      const resumeBtn = document.createElement('button');
      resumeBtn.className = 'btn btn--primary';
      resumeBtn.style.height = '36px';
      resumeBtn.textContent = 'Retomar';
      resumeBtn.addEventListener('click', async () => {
        if (!cartStore.isEmpty()) {
          const replace = await confirmDialog({
            title: 'Reemplazar carrito activo',
            message: 'Ya tienes una venta activa en el carrito. ¿Deseas reemplazarla por esta venta en espera?',
            confirmLabel: 'Reemplazar',
          });
          if (!replace) return;
        }
        const resumed = await heldSaleUseCases.resumeHeldSale(heldSale.id);
        if (resumed) {
          cartStore.loadItems(resumed.items);
          showToast(`Venta "${resumed.name}" retomada`, 'success');
          onChanged?.();
          closeAllModals();
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn--ghost';
      deleteBtn.style.height = '36px';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
          title: 'Eliminar venta en espera',
          message: `¿Eliminar "${heldSale.name}"? Esta acción no se puede deshacer.`,
          confirmLabel: 'Eliminar',
        });
        if (!confirmed) return;
        await heldSaleUseCases.deleteHeldSale(heldSale.id);
        showToast('Venta en espera eliminada', 'success');
        onChanged?.();
        render();
      });

      actions.append(totalLabel, resumeBtn, deleteBtn);
      row.append(info, actions);
      body.appendChild(row);
    });
  }

  await render();

  openModal({
    id: 'held-sales',
    title: 'Ventas en espera',
    bodyNode: body,
    actions: [{ label: 'Cerrar', variant: 'secondary', onClick: closeAllModals }],
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
