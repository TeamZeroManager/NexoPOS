-- Módulo Reportes: agregados calculados en la base (no se descargan todas las ventas).
-- Rango [p_desde, p_hasta). Cuenta ventas COMPLETED y CREDIT (las anuladas no).
create or replace function reporte_ventas(p_empresa_id uuid, p_desde timestamptz, p_hasta timestamptz, p_tz text default 'America/Bogota')
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('VIEW_REPORTS') then raise exception 'No tienes permiso para ver reportes'; end if;
  if p_hasta <= p_desde then raise exception 'El rango de fechas no es válido'; end if;

  return (
    with v as (
      select * from ventas
      where empresa_id = p_empresa_id and created_at >= p_desde and created_at < p_hasta and estado in ('COMPLETED','CREDIT')
    ), d as (
      select dv.*, v.estado from detalle_ventas dv join v on v.id = dv.venta_id
    )
    select json_build_object(
      'totales', (select json_build_object(
          'ventas', count(*), 'ingresos', coalesce(sum(total), 0), 'descuentos', coalesce(sum(descuento), 0),
          'ticket_promedio', coalesce(round(avg(total)), 0),
          'fiado', coalesce(sum(total) filter (where estado = 'CREDIT'), 0)) from v),
      'por_dia', (select coalesce(json_agg(x order by x.dia), '[]'::json) from (
          select (created_at at time zone p_tz)::date as dia, count(*) as ventas, sum(total) as total from v group by 1) x),
      'por_metodo', (select coalesce(json_agg(x order by x.total desc), '[]'::json) from (
          select metodo_pago, count(*) as ventas, sum(total) as total from v group by 1) x),
      'top_productos', (select coalesce(json_agg(x order by x.unidades desc), '[]'::json) from (
          select producto_id, nombre, sum(cantidad) as unidades, sum(precio * cantidad - descuento) as ingresos
          from d group by producto_id, nombre order by sum(cantidad) desc limit 10) x),
      -- Estimada: usa el costo ACTUAL del producto (detalle_ventas no congela costo todavía).
      'utilidad_estimada', (select coalesce(sum((d.precio - coalesce(p.costo, 0)) * d.cantidad - d.descuento), 0)
          from d join productos p on p.id = d.producto_id),
      'productos_sin_costo', (select count(distinct d.producto_id) from d join productos p on p.id = d.producto_id where p.costo = 0)
    )
  );
end; $$;
revoke execute on function reporte_ventas(uuid, timestamptz, timestamptz, text) from anon, public;
grant execute on function reporte_ventas(uuid, timestamptz, timestamptz, text) to authenticated;
