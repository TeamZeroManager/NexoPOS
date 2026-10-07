-- Módulo Catálogo
-- SKU único por empresa (ignora vacíos/nulos y es insensible a mayúsculas).
-- Evita dos productos con el mismo código al escanear/buscar.
create unique index if not exists uq_productos_empresa_sku
  on productos (empresa_id, lower(sku))
  where sku is not null and sku <> '';

-- Nombre único por empresa dentro de las categorías.
create unique index if not exists uq_categorias_empresa_nombre
  on categorias (empresa_id, lower(nombre));

-- Índice para el filtro de activos que usa el Catálogo.
create index if not exists idx_productos_empresa_activo on productos (empresa_id, activo);
