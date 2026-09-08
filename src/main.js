import { StorageAdapter } from './infrastructure/storage/StorageAdapter.js';
import { SessionStore } from './infrastructure/storage/SessionStore.js';
import { LocalStorageProductRepository } from './infrastructure/repositories/LocalStorageProductRepository.js';
import { LocalStorageCategoryRepository } from './infrastructure/repositories/LocalStorageCategoryRepository.js';
import { LocalStorageHeldSaleRepository } from './infrastructure/repositories/LocalStorageHeldSaleRepository.js';
import { LocalStorageSaleRepository } from './infrastructure/repositories/LocalStorageSaleRepository.js';
import { LocalStorageCustomerRepository } from './infrastructure/repositories/LocalStorageCustomerRepository.js';
import { LocalStorageCashRepository } from './infrastructure/repositories/LocalStorageCashRepository.js';
import { LocalStorageMovementRepository } from './infrastructure/repositories/LocalStorageMovementRepository.js';
import { LocalStorageBusinessRepository } from './infrastructure/repositories/LocalStorageBusinessRepository.js';
import { LocalStorageBranchRepository } from './infrastructure/repositories/LocalStorageBranchRepository.js';
import { LocalStorageRoleRepository } from './infrastructure/repositories/LocalStorageRoleRepository.js';
import { LocalStorageStaffUserRepository } from './infrastructure/repositories/LocalStorageStaffUserRepository.js';

import { makeProductUseCases } from './application/useCases/productUseCases.js';
import { makeCategoryUseCases } from './application/useCases/categoryUseCases.js';
import { makeHeldSaleUseCases } from './application/useCases/heldSaleUseCases.js';
import { makeSaleUseCases } from './application/useCases/saleUseCases.js';
import { makeCustomerUseCases } from './application/useCases/customerUseCases.js';
import { makeCashUseCases } from './application/useCases/cashUseCases.js';
import { makeMovementUseCases } from './application/useCases/movementUseCases.js';
import { makeSetupUseCases } from './application/useCases/setupUseCases.js';
import { makeAuthUseCases } from './application/useCases/authUseCases.js';
import { makeStaffUserUseCases } from './application/useCases/staffUserUseCases.js';
import { makeRoleUseCases } from './application/useCases/roleUseCases.js';
import { makeBusinessUseCases } from './application/useCases/businessUseCases.js';

import { seedDemoData } from './infrastructure/mock/seedDemoData.js';
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
import { makeUsersScreen } from './presentation/screens/usersScreen.js';
import { makeRolesScreen } from './presentation/screens/rolesScreen.js';

/**
 * main.js
 * ---------------------------------------------------------
 * Responsabilidad:
 *   ÚNICO lugar del proyecto donde se decide qué implementación
 *   concreta de infraestructura se usa (hoy: LocalStorage), y el
 *   único que orquesta el flujo Setup → Login → Panel. Ningún
 *   caso de uso ni regla de dominio conoce estos detalles.
 */
const storage = new StorageAdapter();
const sessionStore = new SessionStore(storage);

const productRepository = new LocalStorageProductRepository(storage);
const categoryRepository = new LocalStorageCategoryRepository(storage);
const heldSaleRepository = new LocalStorageHeldSaleRepository(storage);
const saleRepository = new LocalStorageSaleRepository(storage);
const customerRepository = new LocalStorageCustomerRepository(storage);
const cashRepository = new LocalStorageCashRepository(storage);
const movementRepository = new LocalStorageMovementRepository(storage);
const businessRepository = new LocalStorageBusinessRepository(storage);
const branchRepository = new LocalStorageBranchRepository(storage);
const roleRepository = new LocalStorageRoleRepository(storage);
const staffUserRepository = new LocalStorageStaffUserRepository(storage);

const productUseCases = makeProductUseCases({ productRepository });
const categoryUseCases = makeCategoryUseCases({ productRepository, categoryRepository });
const heldSaleUseCases = makeHeldSaleUseCases({ heldSaleRepository });
const saleUseCases = makeSaleUseCases({ productRepository, saleRepository, customerRepository, movementRepository });
const customerUseCases = makeCustomerUseCases({ customerRepository, saleRepository, movementRepository });
const cashUseCases = makeCashUseCases({ cashRepository, movementRepository });
const movementUseCases = makeMovementUseCases({ movementRepository });
const setupUseCases = makeSetupUseCases({ businessRepository, branchRepository, roleRepository, staffUserRepository });
const authUseCases = makeAuthUseCases({ staffUserRepository, roleRepository, sessionStore });
const staffUserUseCases = makeStaffUserUseCases({ staffUserRepository, roleRepository });
const roleUseCases = makeRoleUseCases({ roleRepository });
const businessUseCases = makeBusinessUseCases({ businessRepository });

const cartStore = createCartStore();

function showView(viewId) {
  ['viewSetup', 'viewLogin', 'viewPanel'].forEach((id) => {
    document.getElementById(id).style.display = id === viewId ? '' : 'none';
  });
}

async function showPanel(session) {
  showView('viewPanel');

  const business = await businessUseCases.getCurrent();
  const posBrandName = document.getElementById('posBrandName');
  if (posBrandName) posBrandName.textContent = business?.name ?? 'Negocio';

  await seedDemoData({ productUseCases, categoryUseCases });

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

  const screens = {
    resumen: makeDashboardScreen({ businessUseCases, saleUseCases, cashUseCases, customerUseCases, productUseCases, branchRepository }),
    ventas: makeSalesHistoryScreen({ saleUseCases }),
    clientes: makeCustomersScreen({ customerUseCases }),
    caja: makeCashScreen({ cashUseCases, onChanged: () => topbarActions.refreshCashBadge() }),
    usuarios: makeUsersScreen({ staffUserUseCases, roleUseCases, currentUserId: session.user.id }),
    roles: makeRolesScreen({ roleUseCases }),
  };

  initAppShell({
    session,
    screens,
    onLogout: () => {
      authUseCases.logout();
      cartStore.clear();
      showView('viewLogin');
    },
  });
}

async function bootstrap() {
  initLoginScreen({ authUseCases, onLoggedIn: showPanel });

  const setupComplete = await setupUseCases.isSetupComplete();
  if (!setupComplete) {
    initSetupScreen({ setupUseCases, authUseCases, onComplete: showPanel });
    showView('viewSetup');
    return;
  }

  const session = await authUseCases.getCurrentSession();
  if (session) {
    showPanel(session);
  } else {
    showView('viewLogin');
  }
}

bootstrap();
