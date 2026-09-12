import { ProductRepository } from '../../domain/repositories/ProductRepository.js';
import { supabase } from '../supabaseClient.js';
import { getEmpresaId } from '../supabaseSession.js';

/**
 * SupabaseProductRepository
 * ---------------------------------------------------------
 * Mismo contrato que LocalStorageProductRepository — los casos de
 * uso (productUseCases) no cambian ni una línea al usar esta clase
 * en vez de aquella (ver main.js, único punto que decide cuál usar).
 */
export class SupabaseProductRepository extends ProductRepository {
  toDomain(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.nombre,
      price: row.precio,
      categoryId: row.categoria_id,
      stock: row.stock,
      sku: row.sku,
      image: row.imagen,
      active: row.activo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findAll() {
    const { data, error } = await supabase.from('productos').select('*').order('nombre');
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async findById(id) {
    const { data, error } = await supabase.from('productos').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async findByCategory(categoryId) {
    const { data, error } = await supabase.from('productos').select('*').eq('categoria_id', categoryId);
    if (error) throw error;
    return data.map((r) => this.toDomain(r));
  }

  async countByCategory(categoryId) {
    const { count, error } = await supabase
      .from('productos')
      .select('*', { count: 'exact', head: true })
      .eq('categoria_id', categoryId);
    if (error) throw error;
    return count ?? 0;
  }

  async save(product) {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('productos')
      .insert({
        id: product.id,
        empresa_id: empresaId,
        nombre: product.name,
        precio: product.price,
        categoria_id: product.categoryId,
        stock: product.stock,
        sku: product.sku,
        imagen: product.image,
        activo: product.active,
      })
      .select()
      .single();
    if (error) throw error;
    return this.toDomain(data);
  }

  async update(id, changes) {
    const patch = {};
    if ('name' in changes) patch.nombre = changes.name;
    if ('price' in changes) patch.precio = changes.price;
    if ('categoryId' in changes) patch.categoria_id = changes.categoryId;
    if ('stock' in changes) patch.stock = changes.stock;
    if ('sku' in changes) patch.sku = changes.sku;
    if ('image' in changes) patch.imagen = changes.image;
    if ('active' in changes) patch.activo = changes.active;
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('productos').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return this.toDomain(data);
  }

  async delete(id) {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) throw error;
  }
}
