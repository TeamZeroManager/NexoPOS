import { formatCurrency } from '../../shared/utils/format.js';

/**
 * renderDashboard
 * ---------------------------------------------------------
 * Responsabilidad: pintar el resumen ejecutivo del negocio
 * (ventas de hoy/mes, cajas abiertas, clientes, productos,
 * stock, cuentas por pagar) usando datos reales de los
 * repositorios — nada de datos de ejemplo ni mockeados.
 */
export function makeDashboardScreen({ businessUseCases, saleUseCases, cashUseCases, customerUseCases, productUseCases, branchRepository }) {
  const container = document.getElementById('pageResumen');

  function isToday(isoDate) {
    const d = new Date(isoDate);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }

  function isThisMonth(isoDate) {
    const d = new Date(isoDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  async function render() {
    const [business, branches, sales, cashStatus, customers, products] = await Promise.all([
      businessUseCases.getCurrent(),
      branchRepository.findAll(),
      saleUseCases.listAllSales(),
      cashUseCases.getCashStatus(),
      customerUseCases.listCustomers(),
      productUseCases.listProducts(),
    ]);

    const salesToday = sales.filter((s) => isToday(s.createdAt));
    const salesMonth = sales.filter((s) => isThisMonth(s.createdAt));
    const totalToday = salesToday.reduce((acc, s) => acc + s.total, 0);
    const totalMonth = salesMonth.reduce((acc, s) => acc + s.total, 0);

    const customersWithDebt = customers.filter((c) => c.currentDebt > 0);
    const totalDebt = customers.reduce((acc, c) => acc + c.currentDebt, 0);

    const activeProducts = products.filter((p) => p.active);
    const lowStock = activeProducts.filter((p) => p.stock > 0 && p.stock <= 5);
    const outOfStock = activeProducts.filter((p) => p.stock <= 0);

    container.innerHTML = '';

    const businessCard = document.createElement('div');
    businessCard.className = 'card-section';
    businessCard.style.display = 'flex';
    businessCard.style.alignItems = 'center';
    businessCard.style.gap = '12px';
    businessCard.innerHTML = `
      <div style="width:40px;height:40px;border-radius:8px;background:var(--color-primary);flex-shrink:0;"></div>
      <div>
        <div style="font-weight:600;">${escapeHtml(business?.name ?? 'Negocio')}</div>
        <div style="font-size:0.75rem;color:var(--color-ink-muted);">${business?.nit ? `NIT ${escapeHtml(business.nit)}` : 'Sin NIT registrado'}</div>
      </div>
    `;
    container.appendChild(businessCard);

    const stats = [
      [formatCurrency(totalToday), `Ventas de hoy (${salesToday.length})`],
      [formatCurrency(totalMonth), `Ventas del mes (${salesMonth.length})`],
      [cashStatus ? '1/1' : '0/1', 'Cajas abiertas'],
      [String(customers.length), 'Clientes registrados'],
      [String(customersWithDebt.length), 'Clientes con saldo'],
      [String(activeProducts.length), 'Productos activos'],
      [String(lowStock.length), 'Stock bajo'],
      [String(outOfStock.length), 'Sin stock'],
      [formatCurrency(totalDebt), 'Cuentas por pagar'],
    ];

    const grid = document.createElement('div');
    grid.className = 'stat-grid';
    stats.forEach(([value, label]) => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `<div class="stat-card__value">${value}</div><div class="stat-card__label">${label}</div>`;
      grid.appendChild(card);
    });
    container.appendChild(grid);

    const structureSection = document.createElement('div');
    structureSection.className = 'card-section';
    structureSection.innerHTML = `<strong style="display:block;margin-bottom:8px;">${escapeHtml(business?.name ?? 'Negocio')} — Estructura</strong>`;
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
      <thead><tr><th>Sucursal</th><th>Caja</th></tr></thead>
      <tbody>
        ${branches
          .map((b) => `<tr><td>${escapeHtml(b.name)}</td><td>${escapeHtml(b.cashPointName ?? '—')}</td></tr>`)
          .join('')}
      </tbody>
    `;
    structureSection.appendChild(table);
    container.appendChild(structureSection);
  }

  return { render };
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}
