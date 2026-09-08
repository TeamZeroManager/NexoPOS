/**
 * Permisos disponibles para roles (RBAC). Cada permiso controla el
 * acceso a un módulo o acción concreta. Se muestran en el orden en
 * que aparecen en el formulario de "Nuevo rol".
 */
export const PERMISSIONS = Object.freeze({
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_INVENTORY: 'MANAGE_INVENTORY',
  REGISTER_SALES: 'REGISTER_SALES',
  CHANGE_PRICE_AT_POS: 'CHANGE_PRICE_AT_POS',
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_PRODUCTS: 'MANAGE_PRODUCTS',
  MANAGE_PURCHASES: 'MANAGE_PURCHASES',
  CANCEL_SALES: 'CANCEL_SALES',
  OPEN_CLOSE_CASH: 'OPEN_CLOSE_CASH',
});

export const PERMISSION_LABELS = Object.freeze({
  [PERMISSIONS.MANAGE_USERS]: 'Gestionar usuarios',
  [PERMISSIONS.MANAGE_SETTINGS]: 'Gestionar configuración',
  [PERMISSIONS.MANAGE_INVENTORY]: 'Gestionar inventario',
  [PERMISSIONS.REGISTER_SALES]: 'Registrar ventas',
  [PERMISSIONS.CHANGE_PRICE_AT_POS]: 'Cambiar precio en el punto de venta',
  [PERMISSIONS.VIEW_REPORTS]: 'Ver reportes',
  [PERMISSIONS.MANAGE_ROLES]: 'Gestionar roles y permisos',
  [PERMISSIONS.MANAGE_PRODUCTS]: 'Gestionar productos',
  [PERMISSIONS.MANAGE_PURCHASES]: 'Gestionar compras',
  [PERMISSIONS.CANCEL_SALES]: 'Anular ventas',
  [PERMISSIONS.OPEN_CLOSE_CASH]: 'Abrir / cerrar caja',
});

/** Lista completa, útil para crear el rol Administrador con todo activo. */
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
