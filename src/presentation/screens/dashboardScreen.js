import { formatCurrency } from '../../shared/utils/format.js';
import { escapeHtml } from '../../shared/utils/escape.js';

/**
 * renderDashboard
 * ---------------------------------------------------------
 * Responsabilidad: pintar el resumen ejecutivo del negocio
 * (ventas de hoy/mes, cajas abiertas, clientes, productos,
 * stock, cuentas por pagar) usando datos reales de los
 * repositorios — nada de datos de ejemplo ni mockeados.
 */
export function makeDashboardScreen({ businessUseCases, saleUseCases, cashUseCases, customerUseCases, productUseCases, movementUseCases, branchRepository }) {
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
    const [business, branches, sales, cashStatus, customers, products, comparison] = await Promise.all([
      businessUseCases.getCurrent(),
      branchRepository.findAll(),
      saleUseCases.listAllSales(),
      cashUseCases.getCashStatus(),
      customerUseCases.listCustomers(),
      productUseCases.listProducts(),
      movementUseCases.getMonthOverMonthComparison(),
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

    const comparisonSection = document.createElement('div');
    comparisonSection.className = 'card-section';
    comparisonSection.innerHTML = `<strong style="display:block;margin-bottom:12px;">Ingresos y egresos vs. mes anterior</strong>`;
    const compGrid = document.createElement('div');
    compGrid.style.display = 'grid';
    compGrid.style.gridTemplateColumns = '1fr 1fr';
    compGrid.style.gap = '12px';
    compGrid.appendChild(
      renderComparisonCard('Ingresos este mes', comparison.current.income, comparison.incomeChangePct, 'up')
    );
    compGrid.appendChild(
      renderComparisonCard('Egresos este mes', comparison.current.expense, comparison.expenseChangePct, 'down')
    );
    comparisonSection.appendChild(compGrid);
    container.appendChild(comparisonSection);

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


/**
 * renderComparisonCard
 * ---------------------------------------------------------
 * goodDirection: 'up' significa que subir es bueno (ingresos);
 * 'down' significa que bajar es bueno (egresos). El color y la
 * flecha reflejan si el cambio del mes fue favorable o no —
 * nunca solo "verde = subió", porque para egresos subir es malo.
 */
function renderComparisonCard(label, currentValue, changePct, goodDirection) {
  let arrow = '→';
  let color = 'var(--color-ink-muted)';
  let detail = 'Sin datos del mes anterior para comparar';

  if (changePct !== null) {
    if (changePct > 0) arrow = '▲';
    else if (changePct < 0) arrow = '▼';

    const isFavorable =
      changePct === 0 ? null : goodDirection === 'up' ? changePct > 0 : changePct < 0;
    color = isFavorable === null ? 'var(--color-ink-muted)' : isFavorable ? 'var(--color-success)' : 'var(--color-danger)';
    detail = `${arrow} ${Math.abs(changePct).toFixed(1)}% vs. mes anterior`;
  }

  const card = document.createElement('div');
  card.style.padding = '12px';
  card.style.border = '1px solid var(--color-border)';
  card.style.borderRadius = 'var(--radius-md)';
  card.innerHTML = `
    <div style="font-size:0.8125rem; color:var(--color-ink-muted); margin-bottom:4px;">${label}</div>
    <div style="font-family:var(--font-money); font-size:1.375rem; font-weight:600;">${formatCurrency(currentValue)}</div>
    <div style="font-size:0.8125rem; color:${color}; margin-top:4px; font-weight:600;">${detail}</div>
  `;
  return card;
}
