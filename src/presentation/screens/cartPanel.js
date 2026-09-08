import { renderCartItem } from '../components/cartItem.js';
import { renderEmptyState } from '../components/emptyState.js';
import { openDiscountModal } from '../components/discountModal.js';
import { openHoldSaleModal } from '../components/holdSaleModal.js';
import { openHeldSalesModal } from '../components/heldSalesModal.js';
import { openPaymentModal } from '../components/paymentModal.js';
import { openCustomerPickerModal } from '../components/customerPickerModal.js';
import { openFiadosModal } from '../components/fiadosModal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency } from '../../shared/utils/format.js';

/**
 * initCartPanel
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Conectar el carrito en memoria (cartStore) con el HTML del
 *   panel izquierdo y con la barra flotante de móvil. También
 *   maneja "Guardar en espera", ventas en espera, cobro (Fase 5)
 *   y Fiados (sección 24): asignar cliente al carrito y abrir el
 *   módulo de deudas/abonos.
 *
 * Dependencias:
 *   cartStore, heldSaleUseCases, saleUseCases, customerUseCases,
 *   onSaleCompleted (refresca la grilla de productos tras un cobro
 *   porque el stock cambia).
 */
export function initCartPanel({ cartStore, heldSaleUseCases, saleUseCases, customerUseCases, onSaleCompleted }) {
  const cartItemsEl = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('cartSubtotal');
  const discountEl = document.getElementById('cartDiscount');
  const totalEl = document.getElementById('cartTotal');
  const btnHoldSale = document.getElementById('btnHoldSale');
  const btnClearCart = document.getElementById('btnClearCart');
  const btnPay = document.getElementById('btnPay');
  const panelCart = document.querySelector('.panel-cart');
  const mobileCartBar = document.getElementById('mobileCartBar');
  const mobileCartTotal = document.getElementById('mobileCartTotal');
  const btnOpenCartMobile = document.getElementById('btnOpenCartMobile');
  const btnCloseCartMobile = document.getElementById('btnCloseCartMobile');
  const btnHeldSales = document.getElementById('btnHeldSales');
  const heldSalesCount = document.getElementById('heldSalesCount');
  const cartCustomerName = document.getElementById('cartCustomerName');
  const btnChangeCustomer = document.getElementById('btnChangeCustomer');
  const btnFiados = document.getElementById('btnFiados');

  async function refreshHeldSalesCount() {
    const heldSales = await heldSaleUseCases.listHeldSales();
    heldSalesCount.textContent = `· ${heldSales.length}`;
  }

  function render(state) {
    cartItemsEl.innerHTML = '';

    if (state.items.length === 0) {
      cartItemsEl.appendChild(
        renderEmptyState({ title: 'Carrito vacío', description: 'Toca un producto para agregarlo.' })
      );
    } else {
      state.items.forEach((item) => {
        cartItemsEl.appendChild(
          renderCartItem(item, {
            onIncrement: (i) => safely(() => cartStore.setQuantity(i.productId, i.quantity + 1)),
            onDecrement: (i) => safely(() => cartStore.setQuantity(i.productId, i.quantity - 1)),
            onDiscount: (i) =>
              openDiscountModal({
                item: i,
                onApply: (value) => cartStore.setDiscount(i.productId, value),
              }),
            onRemove: (i) => cartStore.removeItem(i.productId),
          })
        );
      });
    }

    subtotalEl.textContent = formatCurrency(state.subtotal);
    discountEl.textContent = `–${formatCurrency(state.discount)}`;
    totalEl.textContent = formatCurrency(state.total);
    cartCustomerName.textContent = state.customer.name;

    const itemCount = state.items.reduce((acc, i) => acc + i.quantity, 0);
    mobileCartTotal.textContent = `${formatCurrency(state.total)} · ${itemCount} items`;

    const hasItems = state.items.length > 0;
    btnHoldSale.disabled = !hasItems;
    btnClearCart.disabled = !hasItems;
    btnPay.disabled = !hasItems;
  }

  function safely(fn) {
    try {
      fn();
    } catch (error) {
      showToast(error.message, 'danger');
    }
  }

  cartStore.subscribe(render);

  btnClearCart.addEventListener('click', () => cartStore.clear());

  btnHoldSale.addEventListener('click', () => {
    if (cartStore.isEmpty()) return;
    openHoldSaleModal({
      onConfirm: async (name) => {
        await heldSaleUseCases.holdSale({ name, items: cartStore.getState().items });
        cartStore.clear();
        showToast(`Venta "${name}" puesta en espera`, 'success');
        refreshHeldSalesCount();
      },
    });
  });

  btnPay.addEventListener('click', () => {
    if (cartStore.isEmpty()) return;
    openPaymentModal({
      cartStore,
      saleUseCases,
      onCompleted: () => onSaleCompleted?.(),
    });
  });

  btnHeldSales.addEventListener('click', () => {
    openHeldSalesModal({
      heldSaleUseCases,
      cartStore,
      onChanged: refreshHeldSalesCount,
    });
  });

  btnChangeCustomer.addEventListener('click', () => {
    openCustomerPickerModal({ customerUseCases, cartStore });
  });

  btnFiados.addEventListener('click', () => {
    openFiadosModal({ customerUseCases });
  });

  // ---- Panel móvil: abrir/cerrar el carrito como pantalla completa ----
  btnOpenCartMobile?.addEventListener('click', () => {
    panelCart.setAttribute('data-open', 'true');
    mobileCartBar.style.display = 'none';
  });
  btnCloseCartMobile?.addEventListener('click', () => {
    panelCart.removeAttribute('data-open');
    mobileCartBar.style.display = '';
  });

  refreshHeldSalesCount();
}
