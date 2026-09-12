/**
 * supabaseConfig.js
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Único archivo con las credenciales de conexión a Supabase.
 *   La "anon key" es pública por diseño (no es secreta) — la
 *   seguridad real vive en las políticas RLS de la base de datos,
 *   no en ocultar esta clave. NUNCA pongas aquí la service_role key.
 *
 * Si migras este proyecto a otro proyecto de Supabase (otro
 * ambiente, otro cliente), este es el único archivo que cambia.
 */
export const SUPABASE_URL = 'https://txnshyzmzznammjstphn.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_vjMc4Iy8UD4o2n8E9SG1ew__A8q3Lom';
