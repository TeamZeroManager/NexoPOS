import { openModal, closeAllModals } from './modal.js';
import { showToast } from './toast.js';
import { formatCurrency } from '../../shared/utils/format.js';

/**
 * openCustomerPickerModal
 * ---------------------------------------------------------
 * Responsabilidad: asignar un cliente al carrito activo (botón
 * "Cambiar" en el encabezado del carrito). Necesario para poder
 * fiar una venta (sección 24) — sin cliente, no hay a quién
 * cargarle la deuda.
 */
export async function openCustomerPickerModal({ customerUseCases, cartStore }) {
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';
  body.style.maxHeight = '55vh';
  body.style.overflowY = 'auto';

  async function render() {
    const customers = await customerUseCases.listCustomers();
    body.innerHTML = '';

    // Opción "Mostrador" (sin cliente asignado)
    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.className = 'customer-card';
    noneBtn.style.width = '100%';
    noneBtn.style.textAlign = 'left';
    noneBtn.innerHTML = `<span>Mostrador (sin cliente)</span>`;
    noneBtn.addEventListener('click', () => {
      cartStore.clearCustomer();
      closeAllModals();
    });
    body.appendChild(noneBtn);

    customers.forEach((customer) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'customer-card';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.innerHTML = `
        <span>${escapeHtml(customer.name)}</span>
        <span class="customer-card__debt">${formatCurrency(customer.currentDebt)} deuda</span>
      `;
      btn.addEventListener('click', () => {
        cartStore.setCustomer(customer.id, customer.name);
        closeAllModals();
      });
      body.appendChild(btn);
    });

    // ---- Crear cliente rápido ----
    const form = document.createElement('div');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '8px';
    form.style.marginTop = '8px';
    form.innerHTML = `
      <input class="search-input" id="newCustomerName" placeholder="Nombre del cliente">
      <input class="search-input" id="newCustomerCreditLimit" type="number" min="0" step="1" placeholder="Cupo de crédito (pesos)">
    `;
    const createBtn = document.createElement('button');
    createBtn.type = 'button';
    createBtn.className = 'btn btn--primary';
    createBtn.textContent = '+ Crear cliente y asignar';
    createBtn.addEventListener('click', async () => {
      const name = form.querySelector('#newCustomerName').value.trim();
      const creditLimit = Number(form.querySelector('#newCustomerCreditLimit').value || 0);
      if (!name) return;
      try {
        const customer = await customerUseCases.createCustomer({ name, creditLimit });
        cartStore.setCustomer(customer.id, customer.name);
        showToast(`Cliente "${customer.name}" creado`, 'success');
        closeAllModals();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });
    form.appendChild(createBtn);
    body.appendChild(form);
  }

  await render();

  openModal({
    id: 'customer-picker',
    title: 'Asignar cliente',
    bodyNode: body,
    actions: [{ label: 'Cerrar', variant: 'secondary', onClick: closeAllModals }],
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
