import { StaffUserRepository } from '../../domain/repositories/StaffUserRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

/**
 * SupabaseStaffUserRepository
 * ---------------------------------------------------------
 * La contraseña YA NO vive aquí (ni siquiera hasheada) — la maneja
 * Supabase Auth. `save()` existe por compatibilidad de interfaz,
 * pero crear un usuario nuevo real pasa por createViaEdgeFunction()
 * (llama a la Edge Function `create-staff-user`, que usa la
 * service_role key para crear el usuario de Auth SIN cerrar la
 * sesión de quien lo está creando — ver supabase/functions).
 */
export class SupabaseStaffUserRepository extends StaffUserRepository {
  toDomain(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.nombre,
      username: row.username,
      roleId: row.rol_id,
      active: row.activo,
      createdAt: row.created_at,
    };
  }

  async findAll() {
    const { data, error } = await supabase.from('usuarios').select('*').order('created_at');
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async findById(id) {
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async findByUsername(username) {
    const { data, error } = await supabase.from('usuarios').select('*').eq('username', username.toLowerCase()).maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  /** Solo usado por el setup inicial (el propio usuario se auto-inserta tras signUp). */
  async save(user) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        id: user.id,
        empresa_id: empresaId,
        nombre: user.name,
        username: user.username,
        rol_id: user.roleId,
        activo: user.active,
      })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }

  async update(id, changes) {
    const patch = {};
    if ('name' in changes) patch.nombre = changes.name;
    if ('roleId' in changes) patch.rol_id = changes.roleId;
    if ('active' in changes) patch.activo = changes.active;
    const { data, error } = await supabase.from('usuarios').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  /** Crea el usuario de Auth + su fila en "usuarios" sin afectar la sesión activa. */
  async createViaEdgeFunction({ nombre, username, password, rolId }) {
    const { data, error } = await supabase.functions.invoke('create-staff-user', {
      body: { nombre, username, password, rolId },
    });
    if (error) {
      const message = data?.error || error.message || 'No se pudo crear el usuario';
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }
}
