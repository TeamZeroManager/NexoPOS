-- ============================================================
-- POS-Pro — Esquema Supabase/PostgreSQL
-- ============================================================
-- Este archivo documenta el esquema YA APLICADO al proyecto
-- "NexoPOS" (txnshyzmzznammjstphn) a través del MCP de Supabase.
-- Sirve como referencia versionada y como script de reproducción
-- si necesitas recrear el esquema en otro proyecto de Supabase.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tenancy ----------

create table empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nit text,
  created_at timestamptz not null default now()
);

create table sucursales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,
  cash_point_name text,
  created_at timestamptz not null default now()
);

-- ---------- Auth / RBAC ----------

create table roles (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,
  permisos text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (empresa_id, nombre)
);

-- usuarios está 1:1 con auth.users. username es GLOBAL (único en todo
-- el proyecto, no por empresa) porque el login debe funcionar desde
-- cualquier dispositivo sin saber de antemano a qué empresa pertenece
-- ("username@pos.local" es el correo interno para Supabase Auth).
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,
  username text not null unique,
  rol_id uuid not null references roles(id),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Catálogo ----------

create table categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,
  precio integer not null check (precio >= 0),
  categoria_id uuid not null references categorias(id),
  stock integer not null check (stock >= 0),
  sku text,
  imagen text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_productos_empresa on productos(empresa_id);
create index idx_productos_categoria on productos(categoria_id);

-- ---------- Clientes (Fiados) ----------

create table clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,
  telefono text,
  email text,
  cupo_credito integer not null default 0 check (cupo_credito >= 0),
  deuda_actual integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_clientes_empresa on clientes(empresa_id);

-- ---------- Caja ----------

create table cajas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  monto_apertura integer not null check (monto_apertura >= 0),
  saldo_cierre integer,
  estado text not null default 'OPEN' check (estado in ('OPEN','CLOSED')),
  abierta_en timestamptz not null default now(),
  cerrada_en timestamptz
);

create index idx_cajas_empresa_estado on cajas(empresa_id, estado);

create table movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  caja_id uuid references cajas(id),
  tipo text not null check (tipo in ('INCOME','EXPENSE')),
  concepto text not null,
  monto integer not null check (monto > 0),
  afecta_caja boolean not null default true,
  referencia_id uuid,
  created_at timestamptz not null default now()
);

create index idx_movimientos_caja_empresa on movimientos_caja(empresa_id, created_at);

-- ---------- Inventario (historial de movimientos) ----------

create table movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  producto_id uuid not null references productos(id),
  tipo text not null check (tipo in ('COMPRA','VENTA','AJUSTE','DEVOLUCION')),
  cantidad integer not null, -- signado: +20 compra, -3 venta
  referencia_id uuid,
  created_at timestamptz not null default now()
);

create index idx_mov_inventario_producto on movimientos_inventario(producto_id, created_at);

-- ---------- Ventas ----------

create table ventas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  cliente_id uuid references clientes(id),
  metodo_pago text not null check (metodo_pago in ('CASH','CARD','TRANSFER','CREDIT')),
  subtotal integer not null,
  descuento integer not null default 0,
  total integer not null,
  recibido integer not null default 0,
  cambio integer not null default 0,
  estado text not null default 'PENDING' check (estado in ('PENDING','COMPLETED','CREDIT','CANCELLED')),
  created_at timestamptz not null default now()
);

create index idx_ventas_empresa on ventas(empresa_id, created_at);
create index idx_ventas_cliente on ventas(cliente_id);

-- Precio/nombre "congelados" al momento de la venta — nunca se
-- reconstruye desde productos.precio actual.
create table detalle_ventas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  producto_id uuid not null references productos(id),
  nombre text not null,
  precio integer not null,
  cantidad integer not null check (cantidad > 0),
  descuento integer not null default 0
);

create index idx_detalle_ventas_venta on detalle_ventas(venta_id);

-- ---------- Ventas en espera ----------

create table ventas_en_espera (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,
  items jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_ventas_espera_empresa on ventas_en_espera(empresa_id);

-- ============================================================
-- Funciones auxiliares + RLS multi-tenant
-- ============================================================

create or replace function current_empresa_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from usuarios where id = auth.uid()
$$;

create or replace function has_permission(perm text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select perm = any(r.permisos)
     from usuarios u join roles r on r.id = u.rol_id
     where u.id = auth.uid()),
    false
  )
$$;

alter table empresas enable row level security;
alter table sucursales enable row level security;
alter table roles enable row level security;
alter table usuarios enable row level security;
alter table categorias enable row level security;
alter table productos enable row level security;
alter table clientes enable row level security;
alter table cajas enable row level security;
alter table movimientos_caja enable row level security;
alter table movimientos_inventario enable row level security;
alter table ventas enable row level security;
alter table detalle_ventas enable row level security;
alter table ventas_en_espera enable row level security;

create policy "empresas_select" on empresas for select using (id = current_empresa_id());
create policy "empresas_update" on empresas for update using (id = current_empresa_id());
-- Sin política de INSERT para "authenticated": crear una empresa solo
-- puede pasar a través de setup_business() (SECURITY DEFINER, bypasea
-- RLS con su propia validación de auth.uid() adentro). Se intentó al
-- inicio permitir "insert if auth.uid() is not null" para que el propio
-- setup pudiera hacerlo directo, pero esa política resultó poco fiable
-- en la práctica (ver README — "new row violates row-level security
-- policy for table empresas") y además quedaba más abierta de lo
-- necesario; SECURITY DEFINER es el patrón correcto aquí.

create policy "sucursales_select" on sucursales for select using (empresa_id = current_empresa_id());
create policy "sucursales_insert" on sucursales for insert with check (empresa_id = current_empresa_id());
create policy "sucursales_update" on sucursales for update using (empresa_id = current_empresa_id());

create policy "roles_select" on roles for select using (empresa_id = current_empresa_id());
create policy "roles_insert" on roles for insert with check (empresa_id = current_empresa_id());
create policy "roles_update" on roles for update using (empresa_id = current_empresa_id() and has_permission('MANAGE_ROLES'));

create policy "usuarios_select" on usuarios for select using (empresa_id = current_empresa_id());
create policy "usuarios_update" on usuarios for update using (empresa_id = current_empresa_id() and has_permission('MANAGE_USERS'));
-- Sin política de INSERT para "authenticated": crear usuarios solo pasa
-- por setup_business() o por la Edge Function create-staff-user (ambas
-- con SECURITY DEFINER / service_role), nunca por INSERT directo.

create policy "categorias_all" on categorias for all using (empresa_id = current_empresa_id()) with check (empresa_id = current_empresa_id());
create policy "productos_all" on productos for all using (empresa_id = current_empresa_id()) with check (empresa_id = current_empresa_id());
create policy "clientes_all" on clientes for all using (empresa_id = current_empresa_id()) with check (empresa_id = current_empresa_id());
create policy "cajas_all" on cajas for all using (empresa_id = current_empresa_id()) with check (empresa_id = current_empresa_id());
create policy "movimientos_caja_all" on movimientos_caja for all using (empresa_id = current_empresa_id()) with check (empresa_id = current_empresa_id());
create policy "movimientos_inventario_all" on movimientos_inventario for all using (empresa_id = current_empresa_id()) with check (empresa_id = current_empresa_id());
create policy "ventas_all" on ventas for all using (empresa_id = current_empresa_id()) with check (empresa_id = current_empresa_id());
create policy "ventas_espera_all" on ventas_en_espera for all using (empresa_id = current_empresa_id()) with check (empresa_id = current_empresa_id());

create policy "detalle_ventas_all" on detalle_ventas for all
  using (venta_id in (select id from ventas where empresa_id = current_empresa_id()))
  with check (venta_id in (select id from ventas where empresa_id = current_empresa_id()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  empresas, sucursales, roles, usuarios,
  categorias, productos, clientes,
  cajas, movimientos_caja, movimientos_inventario,
  ventas, detalle_ventas, ventas_en_espera
to authenticated;
revoke all on
  empresas, sucursales, roles, usuarios,
  categorias, productos, clientes,
  cajas, movimientos_caja, movimientos_inventario,
  ventas, detalle_ventas, ventas_en_espera
from anon;

revoke execute on function current_empresa_id() from anon, public;
revoke execute on function has_permission(text) from anon, public;
grant execute on function current_empresa_id() to authenticated;
grant execute on function has_permission(text) to authenticated;

-- ============================================================
-- Transacciones atómicas (venta, venta fiada, abono, setup inicial)
-- ============================================================

create or replace function registrar_venta(
  p_empresa_id uuid, p_cliente_id uuid, p_metodo_pago text, p_items jsonb, p_recibido integer
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_subtotal integer := 0; v_descuento integer := 0; v_total integer; v_cambio integer := 0;
  v_recibido integer := p_recibido; v_venta_id uuid; item jsonb; v_check record; v_prod record;
begin
  if p_empresa_id is distinct from current_empresa_id() then
    raise exception 'No autorizado para esta empresa';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta requiere al menos un producto';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    select id, precio, stock into v_check from productos
      where id = (item->>'producto_id')::uuid and empresa_id = p_empresa_id for update;
    if v_check.id is null then raise exception 'Producto no encontrado: %', item->>'producto_id'; end if;
    if v_check.stock < (item->>'cantidad')::integer then
      raise exception 'Stock insuficiente para el producto %', v_check.id;
    end if;
    v_subtotal := v_subtotal + v_check.precio * (item->>'cantidad')::integer;
    v_descuento := v_descuento + coalesce((item->>'descuento')::integer, 0);
  end loop;

  v_total := v_subtotal - v_descuento;
  if v_total < 0 then raise exception 'El total no puede ser negativo'; end if;

  if p_metodo_pago = 'CASH' then
    if v_recibido < v_total then raise exception 'Pago insuficiente: faltan %', (v_total - v_recibido); end if;
    v_cambio := v_recibido - v_total;
  else
    v_recibido := v_total; v_cambio := 0;
  end if;

  insert into ventas (empresa_id, cliente_id, metodo_pago, subtotal, descuento, total, recibido, cambio, estado)
  values (p_empresa_id, p_cliente_id, p_metodo_pago, v_subtotal, v_descuento, v_total, v_recibido, v_cambio, 'COMPLETED')
  returning id into v_venta_id;

  for item in select * from jsonb_array_elements(p_items) loop
    select precio, nombre into v_prod from productos where id = (item->>'producto_id')::uuid;
    insert into detalle_ventas (venta_id, producto_id, nombre, precio, cantidad, descuento)
    values (v_venta_id, (item->>'producto_id')::uuid, v_prod.nombre, v_prod.precio,
            (item->>'cantidad')::integer, coalesce((item->>'descuento')::integer, 0));
    update productos set stock = stock - (item->>'cantidad')::integer, updated_at = now()
      where id = (item->>'producto_id')::uuid;
    insert into movimientos_inventario (empresa_id, producto_id, tipo, cantidad, referencia_id)
    values (p_empresa_id, (item->>'producto_id')::uuid, 'VENTA', -1 * (item->>'cantidad')::integer, v_venta_id);
  end loop;

  insert into movimientos_caja (empresa_id, tipo, concepto, monto, afecta_caja, referencia_id)
  values (p_empresa_id, 'INCOME', 'Venta ' || p_metodo_pago, v_total, (p_metodo_pago = 'CASH'), v_venta_id);

  return (select row_to_json(v) from (select * from ventas where id = v_venta_id) v);
end;
$$;

create or replace function registrar_venta_fiada(
  p_empresa_id uuid, p_cliente_id uuid, p_items jsonb
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_subtotal integer := 0; v_descuento integer := 0; v_total integer; v_venta_id uuid;
  item jsonb; v_check record; v_prod record; v_cliente record;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;

  select id, cupo_credito, deuda_actual, nombre into v_cliente from clientes
    where id = p_cliente_id and empresa_id = p_empresa_id for update;
  if v_cliente.id is null then raise exception 'Cliente no encontrado'; end if;

  for item in select * from jsonb_array_elements(p_items) loop
    select id, precio, stock into v_check from productos
      where id = (item->>'producto_id')::uuid and empresa_id = p_empresa_id for update;
    if v_check.id is null then raise exception 'Producto no encontrado: %', item->>'producto_id'; end if;
    if v_check.stock < (item->>'cantidad')::integer then
      raise exception 'Stock insuficiente para el producto %', v_check.id;
    end if;
    v_subtotal := v_subtotal + v_check.precio * (item->>'cantidad')::integer;
    v_descuento := v_descuento + coalesce((item->>'descuento')::integer, 0);
  end loop;

  v_total := v_subtotal - v_descuento;
  if v_cliente.deuda_actual + v_total > v_cliente.cupo_credito then
    raise exception 'Cupo de crédito insuficiente: cupo %, deuda proyectada %',
      v_cliente.cupo_credito, (v_cliente.deuda_actual + v_total);
  end if;

  insert into ventas (empresa_id, cliente_id, metodo_pago, subtotal, descuento, total, recibido, cambio, estado)
  values (p_empresa_id, p_cliente_id, 'CREDIT', v_subtotal, v_descuento, v_total, 0, 0, 'CREDIT')
  returning id into v_venta_id;

  for item in select * from jsonb_array_elements(p_items) loop
    select precio, nombre into v_prod from productos where id = (item->>'producto_id')::uuid;
    insert into detalle_ventas (venta_id, producto_id, nombre, precio, cantidad, descuento)
    values (v_venta_id, (item->>'producto_id')::uuid, v_prod.nombre, v_prod.precio,
            (item->>'cantidad')::integer, coalesce((item->>'descuento')::integer, 0));
    update productos set stock = stock - (item->>'cantidad')::integer, updated_at = now()
      where id = (item->>'producto_id')::uuid;
    insert into movimientos_inventario (empresa_id, producto_id, tipo, cantidad, referencia_id)
    values (p_empresa_id, (item->>'producto_id')::uuid, 'VENTA', -1 * (item->>'cantidad')::integer, v_venta_id);
  end loop;

  update clientes set deuda_actual = deuda_actual + v_total where id = p_cliente_id;

  return (select row_to_json(v) from (select * from ventas where id = v_venta_id) v);
end;
$$;

create or replace function registrar_abono(
  p_empresa_id uuid, p_cliente_id uuid, p_monto integer
) returns json
language plpgsql security definer set search_path = public as $$
declare v_cliente record;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  select id, deuda_actual, nombre into v_cliente from clientes where id = p_cliente_id and empresa_id = p_empresa_id for update;
  if v_cliente.id is null then raise exception 'Cliente no encontrado'; end if;
  if p_monto <= 0 then raise exception 'El abono debe ser un monto positivo'; end if;
  if p_monto > v_cliente.deuda_actual then raise exception 'El abono no puede ser mayor a la deuda actual'; end if;

  update clientes set deuda_actual = deuda_actual - p_monto where id = p_cliente_id;
  insert into movimientos_caja (empresa_id, tipo, concepto, monto, afecta_caja, referencia_id)
  values (p_empresa_id, 'INCOME', 'Abono de ' || v_cliente.nombre, p_monto, true, p_cliente_id);

  return (select row_to_json(c) from (select * from clientes where id = p_cliente_id) c);
end;
$$;

create or replace function setup_business(
  p_nombre text, p_nit text, p_sucursal text, p_caja text,
  p_admin_nombre text, p_username text, p_permisos text[]
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
  v_rol_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión antes de crear un negocio';
  end if;
  if exists (select 1 from usuarios where id = v_uid) then
    raise exception 'Este usuario ya pertenece a un negocio';
  end if;

  insert into empresas (nombre, nit) values (p_nombre, p_nit) returning id into v_empresa_id;
  insert into sucursales (empresa_id, nombre, cash_point_name) values (v_empresa_id, p_sucursal, p_caja);
  insert into roles (empresa_id, nombre, permisos) values (v_empresa_id, 'Administrador', p_permisos) returning id into v_rol_id;
  insert into usuarios (id, empresa_id, nombre, username, rol_id, activo)
    values (v_uid, v_empresa_id, p_admin_nombre, p_username, v_rol_id, true);

  return json_build_object('empresa_id', v_empresa_id, 'rol_id', v_rol_id);
end;
$$;

revoke execute on function registrar_venta(uuid, uuid, text, jsonb, integer) from anon, public;
revoke execute on function registrar_venta_fiada(uuid, uuid, jsonb) from anon, public;
revoke execute on function registrar_abono(uuid, uuid, integer) from anon, public;
revoke execute on function setup_business(text, text, text, text, text, text, text[]) from anon, public;
grant execute on function registrar_venta(uuid, uuid, text, jsonb, integer) to authenticated;
grant execute on function registrar_venta_fiada(uuid, uuid, jsonb) to authenticated;
grant execute on function registrar_abono(uuid, uuid, integer) to authenticated;
grant execute on function setup_business(text, text, text, text, text, text, text[]) to authenticated;
