-- Módulo Inventario: stock mínimo, motivo/autor en movimientos y ajuste atómico.
alter table productos add column if not exists stock_minimo integer not null default 5 check (stock_minimo >= 0);
alter table movimientos_inventario add column if not exists motivo text;
alter table movimientos_inventario add column if not exists usuario_id uuid default auth.uid() references usuarios(id) on delete set null;
create index if not exists idx_mov_inventario_empresa on movimientos_inventario(empresa_id, created_at desc);

create or replace function ajustar_inventario(
  p_empresa_id uuid, p_producto_id uuid, p_nuevo_stock integer, p_motivo text, p_stock_minimo integer default null
) returns json
language plpgsql security definer set search_path = public as $$
declare v_prod record; v_delta integer;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('MANAGE_INVENTORY') then raise exception 'No tienes permiso para ajustar inventario'; end if;
  if p_nuevo_stock is null or p_nuevo_stock < 0 then raise exception 'El stock no puede ser negativo'; end if;
  if p_stock_minimo is not null and p_stock_minimo < 0 then raise exception 'El stock mínimo no puede ser negativo'; end if;
  if p_motivo is null or length(trim(p_motivo)) < 3 then raise exception 'Indica el motivo del ajuste'; end if;

  select id, stock into v_prod from productos where id = p_producto_id and empresa_id = p_empresa_id for update;
  if v_prod.id is null then raise exception 'Producto no encontrado'; end if;

  v_delta := p_nuevo_stock - v_prod.stock;
  if v_delta <> 0 then
    update productos set stock = p_nuevo_stock, updated_at = now() where id = p_producto_id;
    insert into movimientos_inventario (empresa_id, producto_id, tipo, cantidad, motivo)
    values (p_empresa_id, p_producto_id, 'AJUSTE', v_delta, trim(p_motivo));
  end if;
  if p_stock_minimo is not null then
    update productos set stock_minimo = p_stock_minimo, updated_at = now() where id = p_producto_id;
  end if;
  return (select row_to_json(p) from (select * from productos where id = p_producto_id) p);
end;
$$;
revoke execute on function ajustar_inventario(uuid, uuid, integer, text, integer) from anon, public;
grant execute on function ajustar_inventario(uuid, uuid, integer, text, integer) to authenticated;
