-- 007: permisos reales en la base. Antes el RBAC solo existía en la interfaz.

-- 1) Un usuario desactivado pierde el acceso al instante (sus políticas y RPC dejan de resolver).
create or replace function current_empresa_id() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from usuarios where id = auth.uid() and activo
$$;
create or replace function has_permission(perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select perm = any(r.permisos) from usuarios u join roles r on r.id = u.rol_id where u.id = auth.uid() and u.activo),
    false)
$$;

-- 2) Privilegios que PostgREST no usa pero que sobraban (TRUNCATE ignora RLS).
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- 3) Productos: escribir exige MANAGE_PRODUCTS; stock y costo solo cambian vía RPC/triggers.
drop policy if exists productos_all on productos;
create policy productos_select on productos for select using (empresa_id = (select current_empresa_id()));
create policy productos_insert on productos for insert with check (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PRODUCTS'));
create policy productos_update on productos for update
  using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PRODUCTS'))
  with check (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PRODUCTS'));
create policy productos_delete on productos for delete using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PRODUCTS'));
revoke update on productos from authenticated;
grant update (nombre, precio, categoria_id, sku, imagen, activo) on productos to authenticated;

-- 4) Categorías
drop policy if exists categorias_all on categorias;
create policy categorias_select on categorias for select using (empresa_id = (select current_empresa_id()));
create policy categorias_insert on categorias for insert with check (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PRODUCTS'));
create policy categorias_update on categorias for update
  using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PRODUCTS'))
  with check (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PRODUCTS'));
create policy categorias_delete on categorias for delete using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_PRODUCTS'));

-- 5) Clientes: la deuda solo cambia vía RPC; el cupo de crédito lo fija quien tiene MANAGE_SETTINGS.
drop policy if exists clientes_all on clientes;
create policy clientes_select on clientes for select using (empresa_id = (select current_empresa_id()));
create policy clientes_insert on clientes for insert with check (
  empresa_id = (select current_empresa_id())
  and (has_permission('REGISTER_SALES') or has_permission('MANAGE_SETTINGS'))
  and (cupo_credito = 0 or has_permission('MANAGE_SETTINGS')));
create policy clientes_update on clientes for update
  using (empresa_id = (select current_empresa_id()) and (has_permission('REGISTER_SALES') or has_permission('MANAGE_SETTINGS')))
  with check (empresa_id = (select current_empresa_id()) and (has_permission('REGISTER_SALES') or has_permission('MANAGE_SETTINGS')));
revoke insert, update, delete on clientes from authenticated;
grant insert (id, empresa_id, nombre, telefono, email, cupo_credito, activo) on clientes to authenticated;
grant update (nombre, telefono, email, activo) on clientes to authenticated;

-- 6) Ventas y detalle: solo lectura directa; se crean/anulan por RPC.
drop policy if exists ventas_all on ventas;
create policy ventas_select on ventas for select using (empresa_id = (select current_empresa_id()));
drop policy if exists detalle_ventas_all on detalle_ventas;
create policy detalle_ventas_select on detalle_ventas for select
  using (venta_id in (select id from ventas where empresa_id = (select current_empresa_id())));
revoke insert, update, delete on ventas, detalle_ventas from authenticated;

-- 7) Inventario: historial solo lectura (lo escriben las RPC y triggers).
drop policy if exists movimientos_inventario_all on movimientos_inventario;
create policy movimientos_inventario_select on movimientos_inventario for select using (empresa_id = (select current_empresa_id()));
revoke insert, update, delete on movimientos_inventario from authenticated;

-- 8) Caja y movimientos: requieren OPEN_CLOSE_CASH; una sola caja abierta por empresa.
drop policy if exists cajas_all on cajas;
create policy cajas_select on cajas for select using (empresa_id = (select current_empresa_id()));
create policy cajas_insert on cajas for insert with check (empresa_id = (select current_empresa_id()) and has_permission('OPEN_CLOSE_CASH') and estado = 'OPEN');
create policy cajas_update on cajas for update
  using (empresa_id = (select current_empresa_id()) and has_permission('OPEN_CLOSE_CASH'))
  with check (empresa_id = (select current_empresa_id()) and has_permission('OPEN_CLOSE_CASH'));
revoke update, delete on cajas from authenticated;
grant update (estado, cerrada_en, saldo_cierre) on cajas to authenticated;
create unique index if not exists uq_cajas_una_abierta on cajas (empresa_id) where estado = 'OPEN';

drop policy if exists movimientos_caja_all on movimientos_caja;
create policy movimientos_caja_select on movimientos_caja for select using (empresa_id = (select current_empresa_id()));
create policy movimientos_caja_insert on movimientos_caja for insert with check (empresa_id = (select current_empresa_id()) and has_permission('OPEN_CLOSE_CASH'));
revoke update, delete on movimientos_caja from authenticated;
create index if not exists idx_movimientos_caja_caja on movimientos_caja (caja_id);

create or replace function movimientos_caja_set_caja() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.caja_id is null then
    select id into new.caja_id from cajas where empresa_id = new.empresa_id and estado = 'OPEN' limit 1;
  end if;
  return new;
end; $$;
drop trigger if exists trg_movimientos_caja_set_caja on movimientos_caja;
create trigger trg_movimientos_caja_set_caja before insert on movimientos_caja for each row execute function movimientos_caja_set_caja();
revoke execute on function movimientos_caja_set_caja() from public, anon, authenticated;

-- 9) Ventas en espera, sucursales
drop policy if exists ventas_espera_all on ventas_en_espera;
create policy ventas_espera_all on ventas_en_espera for all
  using (empresa_id = (select current_empresa_id()) and has_permission('REGISTER_SALES'))
  with check (empresa_id = (select current_empresa_id()) and has_permission('REGISTER_SALES'));
drop policy if exists sucursales_insert on sucursales;
drop policy if exists sucursales_update on sucursales;
create policy sucursales_insert on sucursales for insert with check (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_SETTINGS'));
create policy sucursales_update on sucursales for update
  using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_SETTINGS'))
  with check (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_SETTINGS'));
revoke delete on sucursales from authenticated;

-- 10) Roles y usuarios: crear roles exige MANAGE_ROLES; no se puede asignar un rol de otra empresa
--     ni auto-desactivarse; solo se pueden editar nombre, rol y estado.
drop policy if exists roles_insert on roles;
drop policy if exists roles_update on roles;
create policy roles_insert on roles for insert with check (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_ROLES'));
create policy roles_update on roles for update
  using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_ROLES'))
  with check (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_ROLES'));
revoke delete on roles from authenticated;

drop policy if exists usuarios_update on usuarios;
create policy usuarios_update on usuarios for update
  using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_USERS'))
  with check (
    empresa_id = (select current_empresa_id()) and has_permission('MANAGE_USERS')
    and rol_id in (select id from roles where empresa_id = (select current_empresa_id()))
    and (id <> auth.uid() or activo));
revoke insert, update, delete on usuarios from authenticated;
grant update (nombre, rol_id, activo) on usuarios to authenticated;
alter table usuarios drop constraint if exists usuarios_username_formato;
alter table usuarios add constraint usuarios_username_formato check (username ~ '^[a-z0-9._-]{3,30}$');
create index if not exists idx_usuarios_empresa on usuarios (empresa_id);
create index if not exists idx_usuarios_rol on usuarios (rol_id);

-- 11) updated_at confiable (antes lo ponía el cliente)
create or replace function set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists trg_productos_updated on productos;
create trigger trg_productos_updated before update on productos for each row execute function set_updated_at();
drop trigger if exists trg_categorias_updated on categorias;
create trigger trg_categorias_updated before update on categorias for each row execute function set_updated_at();

-- 12) Un producto creado con stock deja su movimiento de "stock inicial" (trazabilidad).
create or replace function productos_stock_inicial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stock > 0 then
    insert into movimientos_inventario (empresa_id, producto_id, tipo, cantidad, motivo)
    values (new.empresa_id, new.id, 'AJUSTE', new.stock, 'Stock inicial');
  end if;
  return null;
end; $$;
drop trigger if exists trg_productos_stock_inicial on productos;
create trigger trg_productos_stock_inicial after insert on productos for each row execute function productos_stock_inicial();
revoke execute on function productos_stock_inicial() from public, anon, authenticated;
