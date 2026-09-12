import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';

/**
 * supabaseClient.js
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Instancia única del cliente de Supabase para todo el proyecto.
 *   Se carga desde CDN (esm.sh) porque el proyecto no usa bundler
 *   ni npm para el frontend (sección "Sin framework frontend
 *   inicialmente" del spec original) — igual que las fuentes de
 *   Google Fonts, es un <script> equivalente pero como import ES6.
 *
 *   persistSession + autoRefreshToken: la sesión sobrevive a
 *   recargas de página (igual que el SessionStore de LocalStorage
 *   que reemplaza) y el token se renueva solo.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'pos_pro_supabase_auth',
  },
});
