-- Módulos Proveedores y Compras.
alter table productos add column if not exists costo integer not null default 0 check (costo >= 0);

create table if not exists proveedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nombre text not null,
  nit text, contacto text, telefono text, email text, direccion text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_proveedores_empresa on proveedores(empresa_id);
create unique index if not exists uq_proveedores_empresa_nombre on proveedores(empresa_id, lower(nombre));

create table if not exists ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  proveedor_id uuid not null references proveedores(id),
  estado text not null default 'PENDING' check (estado in ('PENDING','RECEIVED','CANCELLED')),
  total integer not null default 0 check (total >= 0),
  notas text,
  creado_por uuid default auth.uid() references usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  recibida_en timestamptz
);
create index if not exists idx_ordenes_empresa on ordenes_compra(empresa_id, created_at desc);
create index if not exists idx_ordenes_proveedor on ordenes_compra(proveedor_id);

create table if not exists detalle_compras (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references ordenes_compra(id) on delete cascade,
  producto_id uuid not null references productos(id),
  nombre text not null,
  cantidad integer not null check (cantidad > 0),
  costo_unitario integer not null check (costo_unitario >= 0)
);
create index if not exists idx_detalle_compras_orden on detalle_compras(orden_id);

alter table proveedores enable row level security;
alter table ordenes_compra enable row level security;
alter table detalle_compras enable row level security;

create policy "proveedores_all" on proveedores for all
  using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PURCHASES'))
  with check (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PURCHASES'));
-- Las órdenes solo se escriben vía RPC (estado y stock consistentes); lectura con permiso.
create policy "ordenes_select" on ordenes_compra for select
  using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PURCHASES'));
create policy "detalle_compras_select" on detalle_compras for select
  using (has_permission('MANAGE_PURCHASES') and orden_id in (select id from ordenes_compra where empresa_id = (select current_empresa_id())));

grant select, insert, update, delete on proveedores to authenticated, service_role;
grant select on ordenes_compra, detalle_compras to authenticated;
grant select, insert, update, delete on ordenes_compra, detalle_compras to service_role;
revoke all on proveedores, ordenes_compra, detalle_compras from anon;

create or replace function crear_orden_compra(p_empresa_id uuid, p_proveedor_id uuid, p_items jsonb, p_notas text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_orden_id uuid; v_total integer := 0; item jsonb; v_prod record; v_cant integer; v_costo integer;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('MANAGE_PURCHASES') then raise exception 'No tienes permiso para gestionar compras'; end if;
  if not exists (select 1 from proveedores where id = p_proveedor_id and empresa_id = p_empresa_id and activo) then
    raise exception 'Proveedor no válido o inactivo';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La orden requiere al menos un producto';
  end if;

  insert into ordenes_compra (empresa_id, proveedor_id, notas) values (p_empresa_id, p_proveedor_id, nullif(trim(p_notas), ''))
  returning id into v_orden_id;

  for item in select * from jsonb_array_elements(p_items) loop
    v_cant := (item->>'cantidad')::integer; v_costo := (item->>'costo_unitario')::integer;
    if v_cant is null or v_cant <= 0 then raise exception 'La cantidad debe ser mayor a 0'; end if;
    if v_costo is null or v_costo < 0 then raise exception 'El costo no puede ser negativo'; end if;
    select id, nombre into v_prod from productos where id = (item->>'producto_id')::uuid and empresa_id = p_empresa_id;
    if v_prod.id is null then raise exception 'Producto no encontrado: %', item->>'producto_id'; end if;
    insert into detalle_compras (orden_id, producto_id, nombre, cantidad, costo_unitario)
    values (v_orden_id, v_prod.id, v_prod.nombre, v_cant, v_costo);
    v_total := v_total + v_cant * v_costo;
  end loop;

  update ordenes_compra set total = v_total where id = v_orden_id;
  return (select row_to_json(o) from (select * from ordenes_compra where id = v_orden_id) o);
end; $$;

create or replace function recibir_orden_compra(p_empresa_id uuid, p_orden_id uuid, p_pagar_de_caja boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare v_orden record; d record; v_prov text;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('MANAGE_PURCHASES') then raise exception 'No tienes permiso para gestionar compras'; end if;
  select * into v_orden from ordenes_compra where id = p_orden_id and empresa_id = p_empresa_id for update;
  if v_orden.id is null then raise exception 'Orden no encontrada'; end if;
  if v_orden.estado <> 'PENDING' then raise exception 'Solo se pueden recibir órdenes pendientes'; end if;

  -- Orden determinista de bloqueo para evitar interbloqueos entre recepciones concurrentes.
  for d in select producto_id, sum(cantidad)::integer as cantidad, max(costo_unitario) as costo
           from detalle_compras where orden_id = p_orden_id group by producto_id order by producto_id loop
    perform 1 from productos where id = d.producto_id for update;
    update productos set stock = stock + d.cantidad, costo = d.costo, updated_at = now() where id = d.producto_id;
    insert into movimientos_inventario (empresa_id, producto_id, tipo, cantidad, referencia_id, motivo)
    values (p_empresa_id, d.producto_id, 'COMPRA', d.cantidad, p_orden_id, 'Recepción de orden de compra');
  end loop;

  select nombre into v_prov from proveedores where id = v_orden.proveedor_id;
  update ordenes_compra set estado = 'RECEIVED', recibida_en = now() where id = p_orden_id;
  if v_orden.total > 0 then
    insert into movimientos_caja (empresa_id, tipo, concepto, monto, afecta_caja, referencia_id)
    values (p_empresa_id, 'EXPENSE', 'Compra a ' || v_prov, v_orden.total, coalesce(p_pagar_de_caja, false), p_orden_id);
  end if;
  return (select row_to_json(o) from (select * from ordenes_compra where id = p_orden_id) o);
end; $$;

create or replace function cancelar_orden_compra(p_empresa_id uuid, p_orden_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_estado text;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('MANAGE_PURCHASES') then raise exception 'No tienes permiso para gestionar compras'; end if;
  select estado into v_estado from ordenes_compra where id = p_orden_id and empresa_id = p_empresa_id for update;
  if v_estado is null then raise exception 'Orden no encontrada'; end if;
  if v_estado <> 'PENDING' then raise exception 'Solo se pueden cancelar órdenes pendientes'; end if;
  update ordenes_compra set estado = 'CANCELLED' where id = p_orden_id;
  return (select row_to_json(o) from (select * from ordenes_compra where id = p_orden_id) o);
end; $$;

revoke execute on function crear_orden_compra(uuid, uuid, jsonb, text) from anon, public;
revoke execute on function recibir_orden_compra(uuid, uuid, boolean) from anon, public;
revoke execute on function cancelar_orden_compra(uuid, uuid) from anon, public;
grant execute on function crear_orden_compra(uuid, uuid, jsonb, text) to authenticated;
grant execute on function recibir_orden_compra(uuid, uuid, boolean) to authenticated;
grant execute on function cancelar_orden_compra(uuid, uuid) to authenticated;
