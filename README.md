# POS-Pro — Fase 0 a 8: Tenancy/Auth/RBAC + Arquitectura + POS completo

Este es el núcleo de negocio de POS-Pro, construido para sobrevivir a
futuras migraciones (TypeScript → React/Vue/Angular → API → Backend →
PostgreSQL) sin reescribirse.

## ⭐ Fase 0 — Configuración inicial, Login y RBAC (lo más importante)

Al abrir la app por primera vez, un asistente **"Crea tu negocio"**
pide: nombre del negocio, NIT (opcional), sucursal, nombre de la caja,
y los datos del administrador (nombre, usuario, contraseña). Esto
crea automáticamente:

- El **negocio** y su primera **sucursal**
- Un rol **Administrador** con todos los permisos activos
- El **usuario administrador**, con contraseña convertida a hash
  (nunca se guarda en texto plano)

Después de crear el sistema, **inicia sesión automáticamente** y entra
al panel. En visitas siguientes, el sistema pide usuario/contraseña
en una pantalla de **login** normal — y la sesión persiste entre
recargas de página (no hay que loguearse cada vez que abres la app).

**RBAC real, no decorativo:** desde "Roles y permisos" puedes crear
roles con permisos específicos (ej. un rol "Cajero" con solo
`Registrar ventas` y `Abrir/cerrar caja`). El menú lateral **se filtra
según los permisos del usuario que inició sesión** — lo verifiqué
creando un usuario con permisos limitados y confirmando que su sidebar
solo muestra Resumen, Punto de Venta, Clientes y Caja.

⚠️ **Advertencia honesta (igual que pide la sección 34 del spec):**
esto es autenticación de interfaz, no un backend real. La contraseña
se hashea (SHA-256) antes de guardarse en `localStorage`, pero
cualquiera con acceso a las herramientas de desarrollador del
navegador puede leer esos datos. Cuando exista backend, esto se
reemplaza por autenticación real de servidor sin cambiar cómo la UI
llama a `authUseCases.login()`.

### Panel con barra lateral

Tras iniciar sesión se abre un panel con estas secciones:

| Página | Estado |
|---|---|
| Resumen | ✅ Funcional — dashboard con datos reales (ventas de hoy/mes, cajas abiertas, clientes, stock, cuentas por pagar) |
| Punto de Venta | ✅ Funcional — es el POS completo de las Fases 1-8, sin cambios |
| Ventas | ✅ Funcional — historial de ventas registradas |
| Clientes | ✅ Funcional — misma lógica de Fiados, como página |
| Caja | ✅ Funcional — misma lógica de apertura/cierre, como página |
| Usuarios | ✅ Funcional — crear usuarios, asignar rol, activar/desactivar |
| Roles y permisos | ✅ Funcional — crear roles con permisos granulares |
| Reportes, Catálogo, Inventario, Compras, Proveedores, Auditoría, Configuración | 🔲 "Próximamente" — visibles en el menú (según permisos) pero sin construir todavía, para no simular algo que no funciona |

## Estado de esta entrega

**Fase 1 — Arquitectura**
✅ Estructura de carpetas por capas
✅ Modelos de datos (entidades)
✅ Reglas de negocio y cálculos (dominio puro, sin HTML/DOM/localStorage)
✅ Interfaces de repositorio (contratos)
✅ Una implementación de infraestructura de ejemplo (`LocalStorageProductRepository`)
✅ Pruebas ejecutables con Node, sin navegador

**Fase 2 — Layout visual**
✅ `index.html`: estructura semántica del POS (topbar, productos, carrito)
✅ `styles/variables.css`: tokens de diseño personalizables por negocio
✅ `styles/reset.css`, `layout.css`, `components.css`, `responsive.css`
✅ Componentes de la sección 42: ProductCard, CartItem, CategoryButton,
   MoneyButton, StatusBadge, CustomerCard, EmptyState, Modal, Toast
✅ Responsive verificado en escritorio, tablet y móvil
✅ Contenido de ejemplo tomado de tu Excel real (Hotel Ferroviario)

**Fase 3 — Productos, Categorías, Buscador**
✅ `application/useCases/productUseCases.js` y `categoryUseCases.js`
✅ `LocalStorageCategoryRepository` (mismo patrón que Product)
✅ Grilla de productos y barra de categorías ahora son 100% dinámicas
✅ Buscador en vivo (por nombre y SKU)
✅ Modal "+ Crear producto" (sección 19), con creación rápida de
   categorías desde el mismo formulario
✅ Modal "Categorías": crear, renombrar y eliminar (sección 20),
   bloqueando el borrado si tiene productos asociados
✅ Toast en vez de `alert()` para todo el feedback (sección 45)
✅ Datos de ejemplo (`seedDemoData`) solo la primera vez que se abre,
   usando tu Excel real como referencia — nunca sobrescribe datos reales
✅ Probado en navegador con Playwright: búsqueda, filtros, creación,
   edición y la regla de negocio de categorías con productos

**Fase 4 (adelantada a pedido) — Carrito y Ventas en espera**
✅ Carrito reubicado al lado izquierdo (Productos ahora a la derecha)
✅ Carrito 100% funcional: agregar, cambiar cantidad (+/-), quitar,
   aplicar rebaja por línea — todo usando los cálculos del dominio
   de la Fase 1 (`calculateSaleSubtotal`, `calculateItemDiscount`, etc.)
✅ Guarda insuficiente de stock: agregar más unidades de las
   disponibles muestra un Toast en vez de romper el carrito
✅ **Ventas en espera** (sección 23): botón "En espera" guarda el
   carrito activo con un nombre (ej. "Mesa 1") y lo vacía; el botón
   "Ventas en espera" del topbar lista las pendientes con su total,
   permite **retomarlas** o eliminarlas
✅ Si ya hay un carrito activo al intentar retomar otra venta en
   espera, se pregunta antes de reemplazarlo (regla explícita del spec)
✅ Barra flotante de móvil actualizada en tiempo real; el carrito se
   abre a pantalla completa con botón "← Volver a productos"
✅ Todo probado en navegador con Playwright (escritorio y móvil)

**Fase 5 — Cobro, métodos de pago, teclado de billetes**
✅ `application/useCases/saleUseCases.js`: `completeSale()` orquesta
   todo el flujo de la sección 16 (valida pago → revalida stock →
   descuenta inventario → crea y persiste la venta como COMPLETED)
✅ `LocalStorageSaleRepository` (las ventas nunca se borran, sección 39)
✅ Modal "Cobrar": selector de método (Efectivo / Tarjeta /
   Transferencia — solo uno por venta, sección 25)
✅ Teclado de billetes (sección 26): $1.000 a $200.000, con
   desglose visible ("$5.000 + $2.000")
✅ "Otro monto" (sección 28) y "🗑 Limpiar" (sección 29)
✅ Estado 🟢/🔴 en tiempo real (sección 27): "Cambio: $X" habilita
   el cobro, "Faltan $X" lo bloquea — igual para Tarjeta/Transferencia,
   que asumen el monto exacto sin necesitar teclado
✅ Al confirmar: descuenta stock real, vacía el carrito, refresca la
   grilla de productos (ves el nuevo stock al instante) y muestra
   un Toast con el cambio entregado
✅ Probado en navegador: efectivo con cambio, tarjeta, verificación
   de que la venta queda en `localStorage` con status `COMPLETED`,
   y la vista en móvil

**Fase 7 — Fiados**
✅ `Customer` ahora tiene repositorio real (`LocalStorageCustomerRepository`)
✅ `customerUseCases.js`: crear cliente, listar, **registrar abono**
   (valida que no exceda la deuda actual), **historial** de ventas fiadas
✅ `saleUseCases.registerCreditSale()`: valida cupo de crédito
   (`assertCreditAvailable`), descuenta inventario igual que una
   venta normal, aumenta la deuda del cliente — nunca se salta la
   validación de stock por ser fiado
✅ El carrito ahora sabe a qué cliente pertenece ("Cliente: Mostrador
   / Cambiar" en el encabezado); asignar un cliente distinto a
   Mostrador habilita un 4º método en el modal de Cobrar: **"Fiar"**
✅ Botón **"Fiados"** del topbar abre el módulo completo: deuda y
   cupo por cliente, botón "Registrar abono" y "Historial"
✅ Probado en navegador: cupo excedido se bloquea con el mensaje
   exacto de la regla de dominio, venta dentro del cupo aumenta la
   deuda y descuenta stock, abono reduce la deuda, abono mayor a la
   deuda se bloquea, historial muestra las ventas fiadas registradas

**Fase 8 — Caja, Ingresos y Egresos**
✅ `cashRegisterCalculations.js`: saldo esperado y diferencia
   (apertura + ingresos en efectivo − egresos en efectivo)
✅ `cashUseCases.js`: abrir caja (bloquea si ya hay una abierta),
   estado en vivo, cerrar caja con efectivo contado
✅ `movementUseCases.js`: registrar ingresos/egresos, listar con
   filtro Desde/Hasta, resumen (Ingresos/Egresos/Balance)
✅ Toda venta genera su movimiento de ingreso automáticamente —
   solo Efectivo afecta el saldo físico de caja (Tarjeta/Transferencia
   se registran igual, pero no "existen" en el cajón); un abono de
   fiado también se registra como ingreso en efectivo
✅ Badge "Caja abierta/cerrada" en el topbar, en vivo, clickeable
✅ Botón "Movimientos": filtros, resumen, tabla y formulario de
   gasto con origen "De la caja" / "Solo registrar" (sección 31:
   un gasto que excede el efectivo disponible NUNCA se bloquea,
   solo advierte — verificado)
✅ Cierre de caja muestra sobrante/faltante en vivo mientras se
   escribe el efectivo contado
✅ Probado en navegador: apertura, venta en efectivo reflejada en
   el saldo esperado, gasto que excede el efectivo (advierte y
   registra igual), cierre con diferencia calculada correctamente

Con esto quedan cubiertas las 8 fases del roadmap original (sección 60
del prompt maestro). El detalle completo de cada módulo, sus reglas
y las decisiones de arquitectura está documentado abajo.

## Bugs corregidos (historial)

**Ronda 3 (reportados por ti):**
1. **Modales que había que cerrar "varias veces"**: `modal.js` ahora
   evita que el mismo modal se abra dos veces por accidente (clics
   repetidos antes de que termine de renderizarse), identificando
   cada modal principal con un `id` único. Además, los botones
   "Cancelar"/"Cerrar" de los modales principales (Crear producto,
   Categorías, Ventas en espera, Fiados, Caja, Movimientos, Cobrar)
   ahora usan `closeAllModals()`, que cierra TODO de una sola vez,
   sin importar qué quedara apilado — un solo clic siempre basta.
   Verificado forzando hasta 3 aperturas seguidas del mismo modal:
   sigue abriendo solo 1, y se cierra con un solo clic.
2. **"Pagar un servicio con o sin descontar de caja"**: esta opción
   ya existía en **Movimientos → Registrar gasto** (radio "De la
   caja" / "Solo registrar", sección 31) — la verifiqué de nuevo tras
   el fix de modales y sigue funcionando: un gasto con "Solo
   registrar" queda en el historial marcado como "(no afecta caja)"
   y el saldo esperado de Caja no se mueve. Si te refieres a otro
   lugar donde también quieras esa opción (por ejemplo, al registrar
   un abono de fiado), dime y lo agrego ahí también.

**Ronda 2:**
3. **Especificidad CSS**: el botón "← Volver a productos" se veía en
   escritorio porque `.btn` (cargado después en `components.css`)
   le ganaba a `.cart-close-mobile`. Se resolvió aumentando la
   especificidad del selector (`.cart-header .cart-close-mobile`).
4. **Barra flotante tapando el botón Cobrar**: al abrir el carrito
   en móvil, la barra flotante de fondo quedaba encima del botón
   "Cobrar". Ahora se oculta mientras el carrito está abierto.

## Cómo ejecutar la aplicación

Los módulos de JavaScript (`import`/`export`) requieren servir los
archivos por HTTP; los navegadores los bloquean por CORS si abres
`index.html` con doble clic (protocolo `file://`).

```bash
npm start
# Sirve en http://localhost:5500 — ábrelo en tu navegador
```

`npm test` corre las pruebas del dominio (cálculos de venta) y de
autenticación (contraseñas, credenciales) sin necesidad de navegador.

`server.js` es un servidor estático de una sola función, sin
dependencias externas (no se instala nada, no se conecta a internet).
Esto es solo para desarrollo local; cuando exista backend (Fase 5-6)
dejará de ser necesario.

### Diseño visual — Fase 2

Abre `index.html` directamente en tu navegador para verlo interactivo
(los estilos cargan solo, sin servidor).

- **Color:** fondo papel frío, tinta verde-negro, acento esmeralda para
  "Cobrar" y estados de éxito, ámbar para pendientes/fiados, rojo para
  bloqueos — igual que pide la sección 27 (🟢/🔴).
- **Tipografía:** IBM Plex Sans en toda la interfaz; IBM Plex Mono
  solo para cifras de dinero, para que los precios alineen como en
  una caja registradora real.
- **Layout:** dos columnas fijas en escritorio (Productos | Carrito),
  una columna en móvil con el carrito como panel deslizante y una
  barra flotante inferior con el total.
- Todos los colores de marca (`--color-primary`, `--color-secondary`)
  están centralizados en `variables.css` para que un negocio los
  personalice sin tocar el resto del CSS (sección 33).

## Cómo probar que el dominio funciona (sin abrir un navegador)

```bash
npm test
# o directamente:
node tests/domain.test.js
```

Esto demuestra la Regla de Oro del proyecto: *toda regla de negocio
debe poder ejecutarse sin depender de HTML, CSS, DOM o LocalStorage.*

## Estructura de carpetas

```
pos-pro/
├── index.html                     ← Setup / Login / Panel con sidebar
├── server.js                      ← Servidor estático (npm start)
├── package.json
├── styles/
│   ├── variables.css              Tokens (colores, tipografía, espaciado)
│   ├── reset.css
│   ├── layout.css                 Estructura de 2 columnas (POS)
│   ├── components.css             ProductCard, CartItem, botones, etc.
│   ├── shell.css                  Setup, login, sidebar, tablas, stats
│   └── responsive.css             Tablet y móvil
├── src/
│   ├── main.js                    Orquesta Setup → Login → Panel
│   │
│   ├── domain/                    ← LA CAPA MÁS IMPORTANTE
│   │   ├── entities/              Product, Category, Customer, Sale,
│   │   │                          Movement, CashRegister, HeldSale,
│   │   │                          Business, Branch, Role, StaffUser
│   │   ├── valueObjects/          Money (dinero en enteros, sin floats)
│   │   ├── calculations/          subtotal, descuento, total, cambio,
│   │   │                          saldo esperado de caja
│   │   ├── rules/                 stock, descuentos, categorías, crédito,
│   │   │                          auth (contraseña, username, credenciales)
│   │   └── repositories/          INTERFACES (contratos), sin implementación
│   │
│   ├── application/
│   │   └── useCases/              productUseCases, categoryUseCases,
│   │                              heldSaleUseCases, saleUseCases,
│   │                              customerUseCases, cashUseCases,
│   │                              movementUseCases, setupUseCases,
│   │                              authUseCases, staffUserUseCases,
│   │                              roleUseCases, businessUseCases
│   │
│   ├── infrastructure/
│   │   ├── storage/                StorageAdapter (único punto que toca
│   │   │                           localStorage), SessionStore (sesión activa)
│   │   ├── repositories/           Local Storage*Repository para
│   │   │                           Product, Category, HeldSale, Sale,
│   │   │                           Customer, Cash, Movement, Business,
│   │   │                           Branch, Role, StaffUser
│   │   └── mock/                   seedDemoData (solo primer uso)
│   │
│   ├── presentation/
│   │   ├── state/                  cartStore (carrito + cliente asignado)
│   │   ├── components/             productCard, categoryChip, cartItem,
│   │   │                           modal, toast, confirmDialog, emptyState,
│   │   │                           paymentModal (con "Fiar"), fiadosModal,
│   │   │                           customerPickerModal, cashModal,
│   │   │                           movementsModal, y formularios/modales
│   │   │                           de rebaja y ventas en espera
│   │   └── screens/                setupScreen, loginScreen, appShell
│   │                              (sidebar + RBAC), dashboardScreen,
│   │                              usersScreen, rolesScreen,
│   │                              salesHistoryScreen, customersScreen,
│   │                              cashScreen, placeholderScreen,
│   │                              posScreen, cartPanel, topbarActions
│   │
│   └── shared/
│       ├── utils/                  generateId (UUID), formatCurrency,
│       │                           formatDate, hashPassword (SHA-256)
│       ├── errors/                 DomainError, ValidationError
│       └── constants/               PAYMENT_METHODS, SALE_STATUS, PERMISSIONS
│
└── tests/
    ├── domain.test.js              Pruebas de cálculos de venta
    └── auth.test.js                Pruebas de reglas de autenticación
```

## Regla de dependencias (Clean Architecture)

```
presentation  →  application  →  domain  ←  infrastructure
```

Las flechas apuntan **hacia el dominio**. El dominio no importa nada
de las otras capas — por eso puede sobrevivir a cualquier migración.

## Decisiones clave de esta fase

| Decisión | Por qué |
|---|---|
| Dinero como enteros (`Money`) | Evita `0.1 + 0.2 !== 0.3`; migra fácil a cualquier lenguaje |
| IDs con UUID, nunca índices de array | Prepara sincronización, múltiples sucursales, base de datos |
| Fechas en ISO 8601 | Formato universal; la UI decide cómo mostrarlo (`formatDate`) |
| Repositorios como interfaces | El dominio nunca sabe si los datos vienen de LocalStorage o de una API |
| Entidades inmutables (`Object.freeze`) | Evita mutaciones accidentales; encaja con TypeScript más adelante |
| `ValidationError` en vez de `alert()` | La UI decide cómo mostrar el error; el dominio decide cuándo ocurre |

## Ejemplo de por qué esto migra bien

Hoy:
```js
const repo = new LocalStorageProductRepository(new StorageAdapter());
await repo.save(product);
```

Mañana (cambiando solo esta línea, en un único archivo):
```js
const repo = new ApiProductRepository(httpClient);
await repo.save(product); // misma firma, mismo caso de uso, mismo dominio
```

`calculateChange`, `validateStock`, `calculateSaleTotal`, etc. **no
cambian nunca** en ese proceso.

## Roadmap original: completo ✅

Las 8 fases planteadas en el prompt maestro (sección 60) están
construidas y probadas: Arquitectura → Layout → Productos/Categorías
→ Carrito → Cobro → Ventas en espera → Fiados → Caja.

## Posibles siguientes pasos (más allá del roadmap original)

Según la sección 46 del prompt maestro, las etapas futuras del
proyecto (V2 en adelante) incluyen, sin implementar complejidad
innecesaria antes de tiempo:

- **Importar/Exportar Excel** (ya conversamos el diseño — pendiente)
- Reportes (ventas diarias/mensuales, productos más vendidos, utilidad)
- Usuarios y permisos reales (Cajero vs Administrador, hoy solo
  simulado en el modelo `Customer`/roles del spec, sin backend)
- Migración a TypeScript, luego a un frontend moderno (React/Vue)
- Backend real + base de datos (PostgreSQL), múltiples cajas y sucursales

La arquitectura por capas ya está preparada para todo esto sin
romper las reglas de negocio (ver sección "Reglas de dependencias"
más abajo).
