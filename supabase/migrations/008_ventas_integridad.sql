-- 008: ventas con validación real, anulación, abonos con permiso, cupo de crédito y costo congelado.
alter table detalle_ventas add column if not exists costo integer check (costo is null or costo >= 0);
alter table ventas
  add column if not exists anulada_en timestamptz,
  add column if not exists anulada_por uuid references usuarios(id) on delete set null,
  add column if not exists motivo_anulacion text;

-- Venta de contado. Agrupa líneas repetidas y bloquea productos en orden (sin interbloqueos).
create or replace function registrar_venta(p_empresa_id uuid, p_cliente_id uuid, p_metodo_pago text, p_items jsonb, p_recibido integer)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_subtotal integer := 0; v_descuento integer := 0; v_total integer; v_cambio integer := 0;
  v_recibido integer := p_recibido; v_venta_id uuid; l record; v_prod record;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('REGISTER_SALES') then raise exception 'No tienes permiso para registrar ventas'; end if;
  if p_metodo_pago is null or p_metodo_pago not in ('CASH','CARD','TRANSFER') then
    raise exception 'Método de pago no válido (las ventas a crédito usan el flujo de fiado)';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta requiere al menos un producto';
  end if;
  if p_cliente_id is not null and not exists (select 1 from clientes where id = p_cliente_id and empresa_id = p_empresa_id) then
    raise exception 'Cliente no encontrado';
  end if;

  for l in
    select (e->>'producto_id')::uuid as pid, sum((e->>'cantidad')::integer) as qty, sum(coalesce((e->>'descuento')::integer, 0)) as disc
    from jsonb_array_elements(p_items) e group by 1 order by 1
  loop
    if l.qty is null or l.qty <= 0 then raise exception 'La cantidad debe ser mayor a 0'; end if;
    if l.disc < 0 then raise exception 'El descuento no puede ser negativo'; end if;
    select id, precio, stock, activo into v_prod from productos where id = l.pid and empresa_id = p_empresa_id for update;
    if v_prod.id is null then raise exception 'Producto no encontrado: %', l.pid; end if;
    if not v_prod.activo then raise exception 'El producto está inactivo'; end if;
    if v_prod.stock < l.qty then raise exception 'Stock insuficiente para el producto %', l.pid; end if;
    if l.disc > v_prod.precio * l.qty then raise exception 'El descuento no puede superar el valor de la línea'; end if;
    v_subtotal := v_subtotal + v_prod.precio * l.qty;
    v_descuento := v_descuento + l.disc;
  end loop;

  v_total := v_subtotal - v_descuento;
  if p_metodo_pago = 'CASH' then
    if v_recibido is null or v_recibido < v_total then
      raise exception 'Pago insuficiente: faltan %', v_total - coalesce(v_recibido, 0);
    end if;
    v_cambio := v_recibido - v_total;
  else
    v_recibido := v_total;
  end if;

  insert into ventas (empresa_id, cliente_id, metodo_pago, subtotal, descuento, total, recibido, cambio, estado)
  values (p_empresa_id, p_cliente_id, p_metodo_pago, v_subtotal, v_descuento, v_total, v_recibido, v_cambio, 'COMPLETED')
  returning id into v_venta_id;

  for l in
    select (e->>'producto_id')::uuid as pid, sum((e->>'cantidad')::integer) as qty, sum(coalesce((e->>'descuento')::integer, 0)) as disc
    from jsonb_array_elements(p_items) e group by 1 order by 1
  loop
    select nombre, precio, costo into v_prod from productos where id = l.pid;
    insert into detalle_ventas (venta_id, producto_id, nombre, precio, cantidad, descuento, costo)
    values (v_venta_id, l.pid, v_prod.nombre, v_prod.precio, l.qty, l.disc, v_prod.costo);
    update productos set stock = stock - l.qty where id = l.pid;
    insert into movimientos_inventario (empresa_id, producto_id, tipo, cantidad, referencia_id)
    values (p_empresa_id, l.pid, 'VENTA', -l.qty, v_venta_id);
  end loop;

  if v_total > 0 then
    insert into movimientos_caja (empresa_id, tipo, concepto, monto, afecta_caja, referencia_id)
    values (p_empresa_id, 'INCOME', 'Venta ' || p_metodo_pago, v_total, (p_metodo_pago = 'CASH'), v_venta_id);
  end if;
  return (select row_to_json(v) from (select * from ventas where id = v_venta_id) v);
end; $$;

-- Venta fiada: mismas validaciones + cupo de crédito. Orden de bloqueo: cliente -> productos.
create or replace function registrar_venta_fiada(p_empresa_id uuid, p_cliente_id uuid, p_items jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_subtotal integer := 0; v_descuento integer := 0; v_total integer; v_venta_id uuid;
  l record; v_prod record; v_cliente record;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('REGISTER_SALES') then raise exception 'No tienes permiso para registrar ventas'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta requiere al menos un producto';
  end if;

  select id, cupo_credito, deuda_actual, activo into v_cliente from clientes
    where id = p_cliente_id and empresa_id = p_empresa_id for update;
  if v_cliente.id is null then raise exception 'Cliente no encontrado'; end if;
  if not v_cliente.activo then raise exception 'El cliente está inactivo'; end if;

  for l in
    select (e->>'producto_id')::uuid as pid, sum((e->>'cantidad')::integer) as qty, sum(coalesce((e->>'descuento')::integer, 0)) as disc
    from jsonb_array_elements(p_items) e group by 1 order by 1
  loop
    if l.qty is null or l.qty <= 0 then raise exception 'La cantidad debe ser mayor a 0'; end if;
    if l.disc < 0 then raise exception 'El descuento no puede ser negativo'; end if;
    select id, precio, stock, activo into v_prod from productos where id = l.pid and empresa_id = p_empresa_id for update;
    if v_prod.id is null then raise exception 'Producto no encontrado: %', l.pid; end if;
    if not v_prod.activo then raise exception 'El producto está inactivo'; end if;
    if v_prod.stock < l.qty then raise exception 'Stock insuficiente para el producto %', l.pid; end if;
    if l.disc > v_prod.precio * l.qty then raise exception 'El descuento no puede superar el valor de la línea'; end if;
    v_subtotal := v_subtotal + v_prod.precio * l.qty;
    v_descuento := v_descuento + l.disc;
  end loop;

  v_total := v_subtotal - v_descuento;
  if v_total <= 0 then raise exception 'El total de una venta fiada debe ser mayor a 0'; end if;
  if v_cliente.deuda_actual + v_total > v_cliente.cupo_credito then
    raise exception 'Cupo de crédito insuficiente: cupo %, deuda proyectada %', v_cliente.cupo_credito, (v_cliente.deuda_actual + v_total);
  end if;

  insert into ventas (empresa_id, cliente_id, metodo_pago, subtotal, descuento, total, recibido, cambio, estado)
  values (p_empresa_id, p_cliente_id, 'CREDIT', v_subtotal, v_descuento, v_total, 0, 0, 'CREDIT')
  returning id into v_venta_id;

  for l in
    select (e->>'producto_id')::uuid as pid, sum((e->>'cantidad')::integer) as qty, sum(coalesce((e->>'descuento')::integer, 0)) as disc
    from jsonb_array_elements(p_items) e group by 1 order by 1
  loop
    select nombre, precio, costo into v_prod from productos where id = l.pid;
    insert into detalle_ventas (venta_id, producto_id, nombre, precio, cantidad, descuento, costo)
    values (v_venta_id, l.pid, v_prod.nombre, v_prod.precio, l.qty, l.disc, v_prod.costo);
    update productos set stock = stock - l.qty where id = l.pid;
    insert into movimientos_inventario (empresa_id, producto_id, tipo, cantidad, referencia_id)
    values (p_empresa_id, l.pid, 'VENTA', -l.qty, v_venta_id);
  end loop;

  update clientes set deuda_actual = deuda_actual + v_total where id = p_cliente_id;
  return (select row_to_json(v) from (select * from ventas where id = v_venta_id) v);
end; $$;

-- Abono: ahora exige permiso y monto válido.
create or replace function registrar_abono(p_empresa_id uuid, p_cliente_id uuid, p_monto integer)
returns json language plpgsql security definer set search_path = public as $$
declare v_cliente record;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('REGISTER_SALES') then raise exception 'No tienes permiso para registrar abonos'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'El abono debe ser un monto positivo'; end if;
  select id, deuda_actual, nombre into v_cliente from clientes where id = p_cliente_id and empresa_id = p_empresa_id for update;
  if v_cliente.id is null then raise exception 'Cliente no encontrado'; end if;
  if p_monto > v_cliente.deuda_actual then raise exception 'El abono no puede ser mayor a la deuda actual'; end if;

  update clientes set deuda_actual = deuda_actual - p_monto where id = p_cliente_id;
  insert into movimientos_caja (empresa_id, tipo, concepto, monto, afecta_caja, referencia_id)
  values (p_empresa_id, 'INCOME', 'Abono de ' || v_cliente.nombre, p_monto, true, p_cliente_id);
  return (select row_to_json(c) from (select * from clientes where id = p_cliente_id) c);
end; $$;

-- Anulación: repone stock, revierte caja (o deuda si fue fiada) y deja motivo, usuario y fecha.
create or replace function anular_venta(p_empresa_id uuid, p_venta_id uuid, p_motivo text)
returns json language plpgsql security definer set search_path = public as $$
declare v_venta record; l record;
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('CANCEL_SALES') then raise exception 'No tienes permiso para anular ventas'; end if;
  if p_motivo is null or length(trim(p_motivo)) < 3 then raise exception 'Indica el motivo de la anulación'; end if;

  select * into v_venta from ventas where id = p_venta_id and empresa_id = p_empresa_id for update;
  if v_venta.id is null then raise exception 'Venta no encontrada'; end if;
  if v_venta.estado not in ('COMPLETED','CREDIT') then raise exception 'Solo se pueden anular ventas completadas o fiadas'; end if;

  if v_venta.estado = 'CREDIT' then
    perform 1 from clientes where id = v_venta.cliente_id for update;
    update clientes set deuda_actual = greatest(0, deuda_actual - v_venta.total) where id = v_venta.cliente_id;
  end if;

  for l in select producto_id, sum(cantidad)::integer as qty from detalle_ventas where venta_id = p_venta_id group by 1 order by 1 loop
    perform 1 from productos where id = l.producto_id for update;
    update productos set stock = stock + l.qty where id = l.producto_id;
    insert into movimientos_inventario (empresa_id, producto_id, tipo, cantidad, referencia_id, motivo)
    values (p_empresa_id, l.producto_id, 'DEVOLUCION', l.qty, p_venta_id, 'Anulación de venta: ' || trim(p_motivo));
  end loop;

  if v_venta.estado = 'COMPLETED' and v_venta.total > 0 then
    insert into movimientos_caja (empresa_id, tipo, concepto, monto, afecta_caja, referencia_id)
    values (p_empresa_id, 'EXPENSE', 'Anulación venta ' || v_venta.metodo_pago, v_venta.total, (v_venta.metodo_pago = 'CASH'), p_venta_id);
  end if;

  update ventas set estado = 'CANCELLED', anulada_en = now(), anulada_por = auth.uid(), motivo_anulacion = trim(p_motivo)
  where id = p_venta_id;
  return (select row_to_json(v) from (select * from ventas where id = p_venta_id) v);
end; $$;

-- Cupo de crédito: solo con MANAGE_SETTINGS.
create or replace function actualizar_cupo_credito(p_empresa_id uuid, p_cliente_id uuid, p_cupo integer)
returns json language plpgsql security definer set search_path = public as $$
begin
  if p_empresa_id is distinct from current_empresa_id() then raise exception 'No autorizado para esta empresa'; end if;
  if not has_permission('MANAGE_SETTINGS') then raise exception 'No tienes permiso para cambiar el cupo de crédito'; end if;
  if p_cupo is null or p_cupo < 0 then raise exception 'El cupo no puede ser negativo'; end if;
  update clientes set cupo_credito = p_cupo where id = p_cliente_id and empresa_id = p_empresa_id;
  if not found then raise exception 'Cliente no encontrado'; end if;
  return (select row_to_json(c) from (select * from clientes where id = p_cliente_id) c);
end; $$;

-- Reporte: la utilidad usa el costo congelado en cada venta (si es anterior a esta migración, el actual).
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
      select dv.*, v.estado, coalesce(dv.costo, p.costo, 0) as costo_aplicado
      from detalle_ventas dv join v on v.id = dv.venta_id left join productos p on p.id = dv.producto_id
    )
    select json_build_object(
      'totales', (select json_build_object('ventas', count(*), 'ingresos', coalesce(sum(total), 0), 'descuentos', coalesce(sum(descuento), 0),
          'ticket_promedio', coalesce(round(avg(total)), 0), 'fiado', coalesce(sum(total) filter (where estado = 'CREDIT'), 0)) from v),
      'por_dia', (select coalesce(json_agg(x order by x.dia), '[]'::json) from (
          select (created_at at time zone p_tz)::date as dia, count(*) as ventas, sum(total) as total from v group by 1) x),
      'por_metodo', (select coalesce(json_agg(x order by x.total desc), '[]'::json) from (
          select metodo_pago, count(*) as ventas, sum(total) as total from v group by 1) x),
      'top_productos', (select coalesce(json_agg(x order by x.unidades desc), '[]'::json) from (
          select producto_id, nombre, sum(cantidad) as unidades, sum(precio * cantidad - descuento) as ingresos
          from d group by producto_id, nombre order by sum(cantidad) desc limit 10) x),
      'utilidad_estimada', (select coalesce(sum((precio - costo_aplicado) * cantidad - descuento), 0) from d),
      'productos_sin_costo', (select count(distinct producto_id) from d where costo_aplicado = 0)
    )
  );
end; $$;

revoke execute on function registrar_venta(uuid, uuid, text, jsonb, integer), registrar_venta_fiada(uuid, uuid, jsonb),
  registrar_abono(uuid, uuid, integer), anular_venta(uuid, uuid, text), actualizar_cupo_credito(uuid, uuid, integer),
  reporte_ventas(uuid, timestamptz, timestamptz, text) from anon, public;
grant execute on function registrar_venta(uuid, uuid, text, jsonb, integer), registrar_venta_fiada(uuid, uuid, jsonb),
  registrar_abono(uuid, uuid, integer), anular_venta(uuid, uuid, text), actualizar_cupo_credito(uuid, uuid, integer),
  reporte_ventas(uuid, timestamptz, timestamptz, text) to authenticated;
