export async function resolve(specifier, context, next) {
  if (specifier.startsWith('https://esm.sh/@supabase')) return { url: 'stub:supabase', shortCircuit: true };
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url === 'stub:supabase') {
    return { format: 'module', shortCircuit: true, source: 'export const createClient = () => globalThis.__fakeSupabase;' };
  }
  return next(url, context);
}
