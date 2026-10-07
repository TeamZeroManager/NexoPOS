import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

export class SupabaseSupplierRepository {
  toDomain(r) {
    if (!r) return null;
    return { id: r.id, name: r.nombre, nit: r.nit, contact: r.contacto, phone: r.telefono, email: r.email, address: r.direccion, active: r.activo, createdAt: r.created_at };
  }
  toRow(s) {
    const map = { name: 'nombre', nit: 'nit', contact: 'contacto', phone: 'telefono', email: 'email', address: 'direccion', active: 'activo' };
    return Object.fromEntries(Object.entries(map).filter(([k]) => k in s).map(([k, col]) => [col, s[k]]));
  }
  async findAll() {
    const { data, error } = await supabase.from('proveedores').select('*').order('nombre');
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }
  async save(supplier) {
    const { data, error } = await supabase.from('proveedores').insert({ ...this.toRow(supplier), empresa_id: await getEmpresaId() }).select().single();
    if (error) throw this.friendly(error);
    return this.toDomain(data);
  }
  async update(id, changes) {
    const { data, error } = await supabase.from('proveedores').update(this.toRow(changes)).eq('id', id).select().maybeSingle();
    if (error) throw this.friendly(error);
    return this.toDomain(data);
  }
  friendly(error) {
    return error.code === '23505' ? new Error('Ya existe un proveedor con ese nombre') : error;
  }
}
