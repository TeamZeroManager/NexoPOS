-- 009: setup_business valida todo en el servidor y ata el username a la cuenta de Auth.
create or replace function setup_business(
  p_nombre text, p_nit text, p_sucursal text, p_caja text, p_admin_nombre text, p_username text, p_permisos text[]
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid; v_rol_id uuid; v_uid uuid := auth.uid();
  v_user text := lower(trim(coalesce(p_username, '')));
  v_all constant text[] := array['MANAGE_USERS','MANAGE_SETTINGS','MANAGE_INVENTORY','REGISTER_SALES','CHANGE_PRICE_AT_POS',
    'VIEW_REPORTS','MANAGE_ROLES','MANAGE_PRODUCTS','MANAGE_PURCHASES','CANCEL_SALES','OPEN_CLOSE_CASH'];
begin
  if v_uid is null then raise exception 'Debes iniciar sesión antes de crear un negocio'; end if;
  if exists (select 1 from usuarios where id = v_uid) then raise exception 'Este usuario ya pertenece a un negocio'; end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 then raise exception 'El nombre del negocio es obligatorio'; end if;
  if p_admin_nombre is null or length(trim(p_admin_nombre)) = 0 then raise exception 'El nombre del administrador es obligatorio'; end if;
  if v_user !~ '^[a-z0-9._-]{3,30}$' then
    raise exception 'El usuario debe tener entre 3 y 30 caracteres: letras minúsculas, números, punto, guion o guion bajo';
  end if;
  -- El username debe coincidir con la cuenta con la que se registró (username@pos.local).
  if (select email from auth.users where id = v_uid) is distinct from v_user || '@pos.local' then
    raise exception 'El usuario no coincide con la cuenta registrada';
  end if;
  if exists (select 1 from usuarios where username = v_user) then raise exception 'Ese nombre de usuario ya está en uso'; end if;
  if p_permisos is not null and not (p_permisos <@ v_all) then raise exception 'Permisos no válidos'; end if;

  insert into empresas (nombre, nit) values (trim(p_nombre), nullif(trim(coalesce(p_nit, '')), '')) returning id into v_empresa_id;
  insert into sucursales (empresa_id, nombre, cash_point_name)
    values (v_empresa_id, coalesce(nullif(trim(p_sucursal), ''), 'Principal'), coalesce(nullif(trim(p_caja), ''), 'Caja 1'));
  -- El primer usuario siempre es Administrador con todos los permisos (nunca un negocio sin quien gestione usuarios/roles).
  insert into roles (empresa_id, nombre, permisos) values (v_empresa_id, 'Administrador', v_all) returning id into v_rol_id;
  insert into usuarios (id, empresa_id, nombre, username, rol_id, activo)
    values (v_uid, v_empresa_id, trim(p_admin_nombre), v_user, v_rol_id, true);
  return json_build_object('empresa_id', v_empresa_id, 'rol_id', v_rol_id);
end; $$;
revoke execute on function setup_business(text, text, text, text, text, text, text[]) from anon, public;
grant execute on function setup_business(text, text, text, text, text, text, text[]) to authenticated;
