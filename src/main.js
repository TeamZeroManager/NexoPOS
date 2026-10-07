import { supabase } from './infrastructure/supabaseClient.js';
import { SupabaseProductRepository } from './infrastructure/repositories/SupabaseProductRepository.js';
import { SupabaseCategoryRepository } from './infrastructure/repositories/SupabaseCategoryRepository.js';
import { SupabaseHeldSaleRepository } from './infrastructure/repositories/SupabaseHeldSaleRepository.js';
import { SupabaseSaleRepository } from './infrastructure/repositories/SupabaseSaleRepository.js';
import { SupabaseCustomerRepository } from './infrastructure/repositories/SupabaseCustomerRepository.js';
import { SupabaseCashRepository } from './infrastructure/repositories/SupabaseCashRepository.js';
import { SupabaseMovementRepository } from './infrastructure/repositories/SupabaseMovementRepository.js';
import { SupabaseBusinessRepository } from './infrastructure/repositories/SupabaseBusinessRepository.js';
import { SupabaseBranchRepository } from './infrastructure/repositories/SupabaseBranchRepository.js';
import { SupabaseRoleRepository } from './infrastructure/repositories/SupabaseRoleRepository.js';
import { SupabaseStaffUserRepository } from './infrastructure/repositories/SupabaseStaffUserRepository.js';
import { SupabaseInventoryRepository } from './infrastructure/repositories/SupabaseInventoryRepository.js';
import { SupabaseSupplierRepository } from './infrastructure/repositories/SupabaseSupplierRepository.js';
import { SupabasePurchaseRepository } from './infrastructure/repositories/SupabasePurchaseRepository.js';
import { SupabaseReportRepository } from './infrastructure/repositories/SupabaseReportRepository.js';
import { SupabaseAuditRepository } from './infrastructure/repositories/SupabaseAuditRepository.js';

import { makeProductUseCases } from './application/useCases/productUseCases.js';
import { makeCategoryUseCases } from './application/useCases/categoryUseCases.js';
import { makeHeldSaleUseCases } from './application/useCases/heldSaleUseCases.js';
import { makeSaleUseCases } from './application/useCases/saleUseCases.js';
import { makeCustomerUseCases } from './application/useCases/customerUseCases.js';
import { makeCashUseCases } from './application/useCases/cashUseCases.js';
import { makeMovementUseCases } from './application/useCases/movementUseCases.js';
import { makeSupabaseSetupUseCases } from './application/useCases/supabaseSetupUseCases.js';
import { makeSupabaseAuthUseCases } from './application/useCases/supabaseAuthUseCases.js';
import { makeStaffUserUseCases } from './application/useCases/staffUserUseCases.js';
import { makeRoleUseCases } from './application/useCases/roleUseCases.js';
import { makeBusinessUseCases } from './application/useCases/businessUseCases.js';
import { makeInventoryUseCases } from './application/useCases/inventoryUseCases.js';
import { makeSupplierUseCases } from './application/useCases/supplierUseCases.js';
import { makePurchaseUseCases } from './application/useCases/purchaseUseCases.js';
import { makeReportUseCases } from './application/useCases/reportUseCases.js';
import { makeAuditUseCases } from './application/useCases/auditUseCases.js';
import { applyBrand } from './shared/utils/theme.js';

import { createCartStore } from './presentation/state/cartStore.js';
import { initPosScreen } from './presentation/screens/posScreen.js';
import { initCartPanel } from './presentation/screens/cartPanel.js';
import { initTopbarActions } from './presentation/screens/topbarActions.js';
import { initSetupScreen } from './presentation/screens/setupScreen.js';
import { initLoginScreen } from './presentation/screens/loginScreen.js';
import { initAppShell } from './presentation/screens/appShell.js';
import { makeDashboardScreen } from './presentation/screens/dashboardScreen.js';
import { makeSalesHistoryScreen } from './presentation/screens/salesHistoryScreen.js';
import { makeCustomersScreen } from './presentation/screens/customersScreen.js';
import { makeCashScreen } from './presentation/screens/cashScreen.js';
import { makeMovementsScreen } from './presentation/screens/movementsScreen.js';
import { makeUsersScreen } from './presentation/screens/usersScreen.js';
import { makeRolesScreen } from './presentation/screens/rolesScreen.js';
import { makeCatalogoScreen } from './presentation/screens/catalogoScreen.js';
import { makeInventarioScreen } from './presentation/screens/inventarioScreen.js';
import { makeProveedoresScreen } from './presentation/screens/proveedoresScreen.js';
import { makeComprasScreen } from './presentation/screens/comprasScreen.js';
import { makeReportesScreen } from './presentation/screens/reportesScreen.js';
import { makeConfiguracionScreen } from './presentation/screens/configuracionScreen.js';
import { makeAuditoriaScreen } from './presentation/screens/auditoriaScreen.js';

/**
 * main.js
 * ---------------------------------------------------------
 * Responsabilidad:
 *   ÚNICO lugar del proyecto donde se decide qué implementación
 *   concreta de infraestructura se usa. Migrado de LocalStorage a
 *   Supabase/PostgreSQL (persistencia central + multi-dispositivo) —
 *   ningún caso de uso ni regla de dominio tuvo que cambiar para
 *   este swap, tal como estaba diseñada la arquitectura.
 *
 *   Las implementaciones LocalStorage* siguen existiendo en el
 *   proyecto (infrastructure/repositories) por si se necesitan de
 *   referencia o modo offline en el futuro — simplemente ya no se
 *   instancian aquí.
 */
const productRepository = new SupabaseProductRepository();
const categoryRepository = new SupabaseCategoryRepository();
const heldSaleRepository = new SupabaseHeldSaleRepository();
const saleRepository = new SupabaseSaleRepository();
const customerRepository = new SupabaseCustomerRepository();
const cashRepository = new SupabaseCashRepository();
const movementRepository = new SupabaseMovementRepository();
const businessRepository = new SupabaseBusinessRepository();
const branchRepository = new SupabaseBranchRepository();
const roleRepository = new SupabaseRoleRepository();
const staffUserRepository = new SupabaseStaffUserRepository();
const inventoryRepository = new SupabaseInventoryRepository();
const supplierRepository = new SupabaseSupplierRepository();
const purchaseRepository = new SupabasePurchaseRepository();
const reportRepository = new SupabaseReportRepository();
const auditRepository = new SupabaseAuditRepository();

const productUseCases = makeProductUseCases({ productRepository });
const categoryUseCases = makeCategoryUseCases({ productRepository, categoryRepository });
const heldSaleUseCases = makeHeldSaleUseCases({ heldSaleRepository });
const saleUseCases = makeSaleUseCases({ productRepository, saleRepository, customerRepository, movementRepository });
const customerUseCases = makeCustomerUseCases({ customerRepository, saleRepository, movementRepository });
const cashUseCases = makeCashUseCases({ cashRepository, movementRepository });
const movementUseCases = makeMovementUseCases({ movementRepository });
const setupUseCases = makeSupabaseSetupUseCases({ staffUserRepository, roleRepository });
const authUseCases = makeSupabaseAuthUseCases({ staffUserRepository, roleRepository });
const staffUserUseCases = makeStaffUserUseCases({ staffUserRepository, roleRepository });
const roleUseCases = makeRoleUseCases({ roleRepository });
const businessUseCases = makeBusinessUseCases({ businessRepository });
const inventoryUseCases = makeInventoryUseCases({ productRepository, inventoryRepository });
const supplierUseCases = makeSupplierUseCases({ supplierRepository });
const purchaseUseCases = makePurchaseUseCases({ purchaseRepository });
const reportUseCases = makeReportUseCases({ reportRepository });
const auditUseCases = makeAuditUseCases({ auditRepository });

const cartStore = createCartStore();
let panelStarted = false;

function showBrand(business) {
  const name = document.getElementById('posBrandName');
  if (name) name.textContent = business?.name ?? 'Negocio';
  const logo = document.getElementById('posBrandLogo');
  if (logo) {
    const ok = typeof business?.logoUrl === 'string' && business.logoUrl.startsWith('https://');
    logo.style.display = ok ? '' : 'none';
    if (ok) logo.src = business.logoUrl;
  }
}

function showView(viewId) {
  ['viewSetup', 'viewLogin', 'viewPanel'].forEach((id) => {
    document.getElementById(id).style.display = id === viewId ? '' : 'none';
  });
}

async function showPanel(session) {
  showView('viewPanel');

  const business = await businessUseCases.getCurrent();
  applyBrand(business);
  showBrand(business);

  // El panel (listeners de POS, carrito, sidebar) solo se inicializa UNA
  // vez por carga de página — si el usuario cierra sesión y vuelve a
  // entrar sin recargar, solo se reconstruye el sidebar (RBAC puede
  // cambiar entre un usuario y otro).
  if (!panelStarted) {
    panelStarted = true;

    const posScreen = initPosScreen({ productUseCases, categoryUseCases, cartStore });
    const topbarActions = initTopbarActions({ cashUseCases, movementUseCases });
    initCartPanel({
      cartStore,
      heldSaleUseCases,
      saleUseCases,
      customerUseCases,
      onSaleCompleted: () => {
        posScreen.refreshProductGrid();
        topbarActions.refreshCashBadge();
      },
    });

    window.__posProTopbarActions = topbarActions;
  }

  const topbarActions = window.__posProTopbarActions;
  const screens = {
    resumen: makeDashboardScreen({ businessUseCases, saleUseCases, cashUseCases, customerUseCases, productUseCases, movementUseCases, branchRepository }),
    ventas: makeSalesHistoryScreen({ saleUseCases, canCancel: (session.role?.permissions ?? []).includes('CANCEL_SALES') }),
    clientes: makeCustomersScreen({ customerUseCases }),
    caja: makeCashScreen({ cashUseCases, onChanged: () => topbarActions.refreshCashBadge() }),
    movimientos: makeMovementsScreen({ movementUseCases, cashUseCases, onChanged: () => topbarActions.refreshCashBadge() }),
    usuarios: makeUsersScreen({ staffUserUseCases, roleUseCases, currentUserId: session.user.id }),
    roles: makeRolesScreen({ roleUseCases }),
    catalogo: makeCatalogoScreen({ productUseCases, categoryUseCases }),
    inventario: makeInventarioScreen({ inventoryUseCases }),
    proveedores: makeProveedoresScreen({ supplierUseCases }),
    compras: makeComprasScreen({ purchaseUseCases, supplierUseCases, productUseCases }),
    reportes: makeReportesScreen({ reportUseCases }),
    configuracion: makeConfiguracionScreen({ businessUseCases, onSaved: showBrand }),
    auditoria: makeAuditoriaScreen({ auditUseCases }),
  };

  initAppShell({
    session,
    screens,
    onLogout: async () => {
      await authUseCases.logout();
      cartStore.clear();
      applyBrand(null);
      showView('viewLogin');
    },
  });
}

async function bootstrap() {
  initLoginScreen({ authUseCases, onLoggedIn: showPanel });
  initSetupScreen({ setupUseCases, authUseCases, onComplete: showPanel });

  document.getElementById('btnGoToSetup').addEventListener('click', () => showView('viewSetup'));
  document.getElementById('btnGoToLogin').addEventListener('click', () => showView('viewLogin'));

  // A diferencia de LocalStorage, aquí NO existe un "único negocio" que
  // determine si mostrar el setup — el backend es compartido y puede
  // tener muchas empresas (multi-tenant real). Por eso el punto de
  // entrada por defecto es el LOGIN; "Crea tu cuenta" lleva al asistente
  // de configuración inicial para quien todavía no tiene negocio.
  const session = await authUseCases.getCurrentSession();
  if (session) {
    showPanel(session);
  } else {
    showView('viewLogin');
  }

  // Si la sesión expira o se cierra desde otra pestaña, refleja el cambio.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      panelStarted = false;
      showView('viewLogin');
    }
  });
}

bootstrap();
