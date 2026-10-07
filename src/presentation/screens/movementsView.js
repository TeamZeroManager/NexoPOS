import { showToast } from '../components/toast.js';
import { formatCurrency, formatDate } from '../../shared/utils/format.js';
import { escapeHtml } from '../../shared/utils/escape.js';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function monthBounds(year, month) {
  const from = new Date(year, month, 1, 0, 0, 0);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

function buildMonthOptions(count = 12) {
  const now = new Date();
  const options = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ value: `${d.getFullYear()}-${d.getMonth()}`, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() });
  }
  return options;
}

function toDateInputValue(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * renderMovementsPanel
 * ---------------------------------------------------------
 * Responsabilidad: pintar el módulo completo de "Movimientos de
 * dinero" (sección 30-31) dentro de CUALQUIER contenedor — una
 * página del sidebar (movementsScreen.js) o el body de un modal
 * (movementsModal.js) — para no duplicar la lógica en dos sitios.
 *
 * Muestra TODOS los movimientos (ingresos por venta, abonos de
 * fiados, egresos manuales), ordenados de más reciente a más
 * antiguo, con filtro por mes (selector) o por rango exacto de
 * días (Desde/Hasta) — cualquiera de los dos ajusta al otro.
 */
export function renderMovementsPanel(container, { movementUseCases, cashUseCases, onChanged }) {
  const monthOptions = buildMonthOptions(12);
  const currentMonth = monthOptions[0];
  const initialBounds = monthBounds(currentMonth.year, currentMonth.month);

  const filters = { from: initialBounds.from, to: initialBounds.to };
  let selectedMonthValue = currentMonth.value;

  async function render() {
    const [summary, movements] = await Promise.all([
      movementUseCases.getSummary(filters),
      movementUseCases.listMovements(filters),
    ]);

    container.innerHTML = '';

    // ---- Filtros: mes o rango exacto de días ----
    const filterSection = document.createElement('div');
    filterSection.className = 'card-section';
    filterSection.innerHTML = `
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
        <label class="field-label" style="flex:1; min-width:180px;">
          Mes
          <select class="search-input" id="monthSelect">
            <option value="">Todos los movimientos</option>
            ${monthOptions
              .map((o) => `<option value="${o.value}" ${o.value === selectedMonthValue ? 'selected' : ''}>${o.label}</option>`)
              .join('')}
          </select>
        </label>
        <label class="field-label" style="flex:1; min-width:150px;">
          Desde (día exacto)
          <input class="search-input" id="filterFrom" type="date" value="${toDateInputValue(filters.from)}">
        </label>
        <label class="field-label" style="flex:1; min-width:150px;">
          Hasta (día exacto)
          <input class="search-input" id="filterTo" type="date" value="${toDateInputValue(filters.to)}">
        </label>
      </div>
    `;
    container.appendChild(filterSection);

    filterSection.querySelector('#monthSelect').addEventListener('change', (e) => {
      selectedMonthValue = e.target.value;
      if (!selectedMonthValue) {
        filters.from = null;
        filters.to = null;
      } else {
        const [y, m] = selectedMonthValue.split('-').map(Number);
        const bounds = monthBounds(y, m);
        filters.from = bounds.from;
        filters.to = bounds.to;
      }
      render();
    });
    filterSection.querySelector('#filterFrom').addEventListener('change', (e) => {
      selectedMonthValue = ''; // un día exacto ya no corresponde a "un mes completo"
      filters.from = e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : null;
      render();
    });
    filterSection.querySelector('#filterTo').addEventListener('change', (e) => {
      selectedMonthValue = '';
      filters.to = e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null;
      render();
    });

    // ---- Resumen del período filtrado ----
    const statGrid = document.createElement('div');
    statGrid.className = 'stat-grid';
    statGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    [
      [formatCurrency(summary.income), 'Ingresos'],
      [formatCurrency(summary.expense), 'Egresos'],
      [formatCurrency(summary.balance), 'Balance'],
      [String(movements.length), 'Movimientos'],
    ].forEach(([value, label]) => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `<div class="stat-card__value">${value}</div><div class="stat-card__label">${label}</div>`;
      statGrid.appendChild(card);
    });
    container.appendChild(statGrid);

    // ---- Tabla: TODOS los movimientos, más reciente primero ----
    const tableSection = document.createElement('div');
    tableSection.className = 'card-section';
    if (movements.length === 0) {
      tableSection.innerHTML = `<p style="color:var(--color-ink-muted); font-size:0.875rem;">Sin movimientos en este rango.</p>`;
    } else {
      const table = document.createElement('table');
      table.className = 'data-table';
      table.innerHTML = `
        <thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Concepto</th><th>Monto</th></tr></thead>
        <tbody>
          ${movements
            .map(
              (m) => `
            <tr>
              <td style="white-space:nowrap;">${formatDate(m.createdAt)}</td>
              <td><span class="badge ${m.type === 'INCOME' ? 'badge--success' : 'badge--danger'}">${m.type === 'INCOME' ? 'Ingreso' : 'Egreso'}</span></td>
              <td>${escapeHtml(m.concept)}${m.affectsCash ? '' : ' <span style="color:var(--color-ink-muted);font-size:0.75rem;">(no afecta caja)</span>'}</td>
              <td style="font-family:var(--font-money); color:${m.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)'};">${m.type === 'INCOME' ? '+' : '–'}${formatCurrency(m.amount)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      `;
      tableSection.appendChild(table);
    }
    container.appendChild(tableSection);

    // ---- Registrar gasto (sección 31) ----
    const form = document.createElement('div');
    form.className = 'card-section';
    form.innerHTML = `
      <strong style="display:block; margin-bottom:8px;">Registrar gasto</strong>
      <input class="search-input" id="expenseConcept" placeholder="Concepto (ej: Compra de bolsas)" style="margin-bottom:8px;">
      <input class="search-input" id="expenseAmount" type="number" min="1" step="1" placeholder="Monto" style="margin-bottom:8px;">
      <div style="display:flex; gap:16px; font-size:0.875rem; margin-bottom:12px;">
        <label style="display:flex; align-items:center; gap:6px;">
          <input type="radio" name="expenseOrigin" value="cash" checked> De la caja
        </label>
        <label style="display:flex; align-items:center; gap:6px;">
          <input type="radio" name="expenseOrigin" value="record"> Solo registrar
        </label>
      </div>
    `;
    const registerBtn = document.createElement('button');
    registerBtn.className = 'btn btn--secondary';
    registerBtn.textContent = '+ Registrar';
    registerBtn.addEventListener('click', async () => {
      const concept = form.querySelector('#expenseConcept').value.trim();
      const amount = Number(form.querySelector('#expenseAmount').value || 0);
      const wantsCash = form.querySelector('input[name="expenseOrigin"]:checked').value === 'cash';
      if (!concept || amount <= 0) return;

      try {
        const cashStatus = wantsCash ? await cashUseCases.getCashStatus() : null;
        const fromCash = wantsCash && cashStatus != null;

        let warning = null;
        if (wantsCash && !cashStatus) {
          warning = 'no hay caja abierta, se registró sin afectar el saldo físico';
        } else if (fromCash && amount > cashStatus.expectedBalance) {
          warning = 'no hay suficiente efectivo en caja, se registró igualmente';
        }

        await movementUseCases.registerExpense({ concept, amount, fromCash });
        showToast(warning ? `Gasto registrado — ${warning}` : 'Gasto registrado', warning ? 'danger' : 'success');
        onChanged?.();
        render();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });
    form.appendChild(registerBtn);
    container.appendChild(form);
  }

  render();
  return { render };
}

