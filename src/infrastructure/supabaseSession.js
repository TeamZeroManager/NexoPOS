import { supabase } from './supabaseClient.js';

/**
 * supabaseSession.js
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Saber a qué empresa pertenece el usuario autenticado actual.
 *   Los repositorios lo usan para escribir empresa_id en cada
 *   fila nueva (INSERT). La lectura/escritura ya está protegida
 *   por RLS en el servidor — esto es solo para poblar la columna,
 *   no es el mecanismo de seguridad (ese vive en la base de datos).
 *
 *   Se cachea en memoria durante la sesión del navegador para no
 *   consultar la tabla "usuarios" en cada operación; se limpia al
 *   cerrar sesión (logout) o al completar el setup inicial.
 */
let cachedEmpresaId = null;

export async function getEmpresaId() {
  if (cachedEmpresaId) return cachedEmpresaId;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
  if (error || !data) return null;

  cachedEmpresaId = data.empresa_id;
  return cachedEmpresaId;
}

export function clearEmpresaIdCache() {
  cachedEmpresaId = null;
}
