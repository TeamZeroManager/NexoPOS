-- Módulo Auditoría: bitácora inmutable de quién cambió qué y cuándo.
create table if not exists auditoria (
  id bigint generated always as identity primary key,
  -- Sin FK a propósito: la bitácora no debe borrarse en cascada ni fallar si se elimina la empresa.
  empresa_id uuid,
  usuario_id uuid references usuarios(id) on delete set null,
  tabla text not null,
  accion text not null check (accion in ('INSERT','UPDATE','DELETE')),
  registro_id uuid,
  antes jsonb,
  despues jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_auditoria_empresa_fecha on auditoria(empresa_id, created_at desc);
create index if not exists idx_auditoria_tabla on auditoria(empresa_id, tabla);

alter table auditoria enable row level security;
create policy "auditoria_select" on auditoria for select
  using (empresa_id = (select current_empresa_id()) and has_permission('MANAGE_SETTINGS'));
revoke all on auditoria from anon, authenticated;
grant select on auditoria to authenticated;
grant select, insert on auditoria to service_role;

create or replace function auditoria_inmutable() returns trigger language plpgsql set search_path = public as $$
begin
  -- Única excepción: el ON DELETE SET NULL de usuario_id al borrar un usuario.
  if tg_op = 'UPDATE' and new.usuario_id is null and old.usuario_id is not null
     and (to_jsonb(new) - 'usuario_id') = (to_jsonb(old) - 'usuario_id') then
    return new;
  end if;
  raise exception 'La bitácora de auditoría no se puede modificar';
end; $$;
drop trigger if exists trg_auditoria_inmutable on auditoria;
create trigger trg_auditoria_inmutable before update or delete on auditoria
  for each row execute function auditoria_inmutable();

create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_row jsonb; v_id uuid; v_empresa uuid; v_user uuid;
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);
  v_id := (v_row->>'id')::uuid;
  v_empresa := case when tg_table_name = 'empresas' then v_id else (v_row->>'empresa_id')::uuid end;

  -- Ruido operativo: el stock y la deuda ya quedan trazados en sus propios movimientos.
  if tg_op = 'UPDATE' then
    if tg_table_name = 'productos' and (v_old - 'stock' - 'updated_at' - 'costo') = (v_new - 'stock' - 'updated_at' - 'costo') then return null; end if;
    if tg_table_name = 'clientes' and (v_old - 'deuda_actual') = (v_new - 'deuda_actual') then return null; end if;
    if v_old = v_new then return null; end if;
  end if;

  -- Durante el registro de un negocio quien actúa aún no existe en "usuarios": se guarda sin autor.
  select id into v_user from usuarios where id = auth.uid();

  insert into auditoria (empresa_id, usuario_id, tabla, accion, registro_id, antes, despues)
  values (v_empresa, v_user, tg_table_name, tg_op, v_id, v_old, v_new);
  return null;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['productos','categorias','clientes','proveedores','ordenes_compra','cajas','roles','usuarios','empresas'] loop
    execute format('drop trigger if exists trg_audit on %I', t);
    execute format('create trigger trg_audit after insert or update or delete on %I for each row execute function audit_trigger()', t);
  end loop;
end $$;
-- Ventas: solo cambios y borrados (cada venta nueva ya queda en su propia tabla).
drop trigger if exists trg_audit on ventas;
create trigger trg_audit after update or delete on ventas for each row execute function audit_trigger();

-- Las funciones de trigger no deben poder invocarse como RPC (el trigger se dispara igual sin EXECUTE).
revoke execute on function audit_trigger() from public, anon, authenticated;
revoke execute on function auditoria_inmutable() from public, anon, authenticated;
