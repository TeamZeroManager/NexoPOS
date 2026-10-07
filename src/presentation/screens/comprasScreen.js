import { formatCurrency, formatDate } from '../../shared/utils/format.js';
import { el, badge, button, table, labeled, formModal } from '../components/dom.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { showToast } from '../components/toast.js';

const STATUS = { PENDING: ['Pendiente', 'pending'], RECEIVED: ['Recibida', 'success'], CANCELLED: ['Cancelada', 'danger'] };

/** Compras: crear órdenes a proveedores y recibirlas (suma stock, actualiza costo y registra el egreso). */
export function makeComprasScreen({ purchaseUseCases, supplierUseCases, productUseCases }) {
  const container = document.getElementById('pageCompras');
  let orders = [];

  async function openNewOrder() {
    const [suppliers, products] = await Promise.all([supplierUseCases.list(), productUseCases.listProducts()]);
    const activeSuppliers = suppliers.filter((s) => s.active);
    const activeProducts = products.filter((p) => p.active);
    if (activeSuppliers.length === 0) return showToast('Primero crea un proveedor activo', 'danger');
    if (activeProducts.length === 0) return showToast('Primero crea productos en el Catálogo', 'danger');

    const lines = [];
    const supplier = el('select', { className: 'search-input' }, activeSuppliers.map((s) => el('option', { value: s.id, textContent: s.name })));
    const product = el('select', { className: 'search-input', style: 'flex:2;min-width:140px;' }, activeProducts.map((p) => el('option', { value: p.id, textContent: p.name })));
    const qty = el('input', { className: 'search-input', type: 'number', min: 1, step: 1, value: 1, style: 'width:80px;' });
    const cost = el('input', { className: 'search-input', type: 'number', min: 0, step: 1, style: 'width:110px;', placeholder: 'Costo c/u' });
    const notes = el('input', { className: 'search-input', placeholder: 'Notas (opcional)' });
    const list = el('div');
    const totalEl = el('strong');
    const byId = Object.fromEntries(activeProducts.map((p) => [p.id, p]));

    const fillCost = () => { cost.value = byId[product.value]?.cost || ''; };
    product.addEventListener('change', fillCost);
    fillCost();

    function drawLines() {
      list.replaceChildren(table(['Producto', 'Cant.', 'Costo c/u', 'Subtotal', ''],
        lines.map((l, i) => [l.name, String(l.quantity), formatCurrency(l.unitCost), formatCurrency(l.quantity * l.unitCost),
          button('Quitar', () => { lines.splice(i, 1); drawLines(); })]), 'Agrega productos a la orden.'));
      totalEl.textContent = `Total: ${formatCurrency(purchaseUseCases.total(lines))}`;
    }
    drawLines();

    const add = button('+ Agregar', () => {
      const p = byId[product.value];
      lines.push({ productId: p.id, name: p.name, quantity: Number(qty.value), unitCost: Number(cost.value) });
      try { purchaseUseCases.normalizeItems(lines); } catch (e) { lines.pop(); return showToast(e.message, 'danger'); }
      drawLines();
    });

    openModal({
      id: 'new-order', title: 'Nueva orden de compra', maxWidth: '640px',
      bodyNode: el('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, [
        labeled('Proveedor', supplier),
        el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;' }, [product, qty, cost, add]),
        list, totalEl, labeled('Notas', notes),
      ]),
      actions: [
        { label: 'Cancelar', variant: 'secondary', onClick: closeAllModals },
        { label: 'Crear orden', variant: 'primary', onClick: async () => {
          try {
            await purchaseUseCases.create({ supplierId: supplier.value, items: lines, notes: notes.value });
            closeAllModals(); showToast('Orden creada', 'success'); await render();
          } catch (e) { showToast(e.message, 'danger'); }
        } },
      ],
    });
  }

  function openReceive(o) {
    formModal({
      id: 'receive-order', title: `Recibir orden de ${o.supplierName}`, submitLabel: 'Recibir mercancía',
      fields: [{ name: 'pay', label: `Pago (${formatCurrency(o.total)})`, options: [
        { value: 'other', label: 'Otro medio (no afecta la caja)' }, { value: 'cash', label: 'Efectivo de la caja' }],
        hint: 'Se suma el stock, se actualiza el costo y se registra el egreso en Movimientos.' }],
      onSubmit: async (v) => {
        await purchaseUseCases.receive(o.id, { payFromCash: v.pay === 'cash' });
        showToast('Orden recibida: inventario actualizado', 'success'); await render();
      },
    });
  }

  async function cancel(o) {
    if (!(await confirmDialog({ title: 'Cancelar orden', message: `¿Cancelar la orden de ${o.supplierName}?`, confirmLabel: 'Cancelar orden' }))) return;
    try { await purchaseUseCases.cancel(o.id); showToast('Orden cancelada', 'success'); await render(); }
    catch (e) { showToast(e.message, 'danger'); }
  }

  function openDetail(o) {
    openModal({
      id: 'order-detail', title: `Orden · ${o.supplierName}`,
      bodyNode: el('div', { style: 'display:flex;flex-direction:column;gap:10px;' }, [
        table(['Producto', 'Cant.', 'Costo c/u', 'Subtotal'], o.items.map((i) => [i.name, String(i.quantity), formatCurrency(i.unitCost), formatCurrency(i.quantity * i.unitCost)])),
        el('strong', { textContent: `Total: ${formatCurrency(o.total)}` }),
        o.notes ? el('div', { textContent: `Notas: ${o.notes}` }) : null,
      ]),
      actions: [{ label: 'Cerrar', variant: 'secondary', onClick: closeAllModals }],
    });
  }

  function draw() {
    container.replaceChildren(el('div', { className: 'card-section' }, [
      el('div', { style: 'display:flex;align-items:center;margin-bottom:12px;' }, [
        el('strong', { textContent: `Órdenes de compra (${orders.length})`, style: 'flex:1;' }),
        button('+ Nueva orden', openNewOrder, 'primary'),
      ]),
      table(['Fecha', 'Proveedor', 'Productos', 'Total', 'Estado', ''],
        orders.map((o) => [formatDate(o.createdAt), o.supplierName, String(o.items.length), formatCurrency(o.total), badge(...STATUS[o.status]),
          el('span', { style: 'display:flex;gap:6px;white-space:nowrap;' }, [
            button('Ver', () => openDetail(o)),
            o.status === 'PENDING' ? button('Recibir', () => openReceive(o), 'primary') : null,
            o.status === 'PENDING' ? button('Cancelar', () => cancel(o)) : null])]),
        'Aún no hay órdenes de compra.'),
    ]));
  }

  async function render() {
    orders = await purchaseUseCases.list();
    draw();
  }
  return { render };
}
