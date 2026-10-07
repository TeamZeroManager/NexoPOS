-- Módulo Configuración: datos del negocio y marca.
alter table empresas
  add column if not exists direccion text,
  add column if not exists telefono text,
  add column if not exists email text,
  add column if not exists logo_url text,
  add column if not exists color_primario text check (color_primario is null or color_primario ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists color_secundario text check (color_secundario is null or color_secundario ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists pie_recibo text;

-- Solo quien tiene MANAGE_SETTINGS puede modificar la empresa.
drop policy if exists "empresas_update" on empresas;
create policy "empresas_update" on empresas for update
  using (id = (select current_empresa_id()) and has_permission('MANAGE_SETTINGS'))
  with check (id = (select current_empresa_id()) and has_permission('MANAGE_SETTINGS'));
