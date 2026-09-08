/**
 * seedDemoData
 * ---------------------------------------------------------
 * Responsabilidad:
 *   Poblar categorías y productos de ejemplo SOLO la primera vez
 *   que se abre la aplicación (catálogo vacío), para que el POS
 *   no se vea vacío al probarlo. Usa los mismos casos de uso que
 *   usaría un usuario real — no escribe directamente a storage.
 *
 * Nota:
 *   Esto es solo para desarrollo/demo. La función de "Importar
 *   Excel" (pendiente, ver conversación) reemplazará esta semilla
 *   como forma real de cargar el catálogo de un negocio.
 */
export async function seedDemoData({ productUseCases, categoryUseCases }) {
  const existingProducts = await productUseCases.listProducts();
  const existingCategories = await categoryUseCases.listCategories();
  if (existingProducts.length > 0 || existingCategories.length > 0) {
    return; // ya hay datos reales, nunca sobrescribir
  }

  const categoryNames = ['Bebidas', 'Panes', 'Fritos', 'Mecato', 'Dulcería', 'Aseo personal', 'Salud'];
  const categories = {};
  for (const name of categoryNames) {
    categories[name] = await categoryUseCases.createCategory({ name });
  }

  const products = [
    { name: 'Agua Brisa 600ml', price: 2800, stock: 18, categoria: 'Bebidas' },
    { name: 'Coca-Cola 350ml', price: 2800, stock: 19, categoria: 'Bebidas' },
    { name: 'Powerade', price: 4000, stock: 18, categoria: 'Bebidas' },
    { name: 'Jugo del Valle', price: 3500, stock: 13, categoria: 'Bebidas' },
    { name: 'Pony Malta 330ml', price: 3000, stock: 2, categoria: 'Bebidas' },
    { name: 'Quatro Pet 400ml', price: 3500, stock: 11, categoria: 'Bebidas' },
    { name: 'Bolsa de Agua Centenario', price: 500, stock: 130, categoria: 'Bebidas' },
    { name: 'Soda Schweppes Pet 400', price: 3500, stock: 8, categoria: 'Bebidas' },
    { name: 'Pan Blandito', price: 1500, stock: 25, categoria: 'Panes' },
    { name: 'Papas Margarita', price: 2500, stock: 30, categoria: 'Fritos' },
    { name: 'Bon Bon Bum', price: 300, stock: 80, categoria: 'Dulcería' },
    { name: 'Jabón de Tocador', price: 2200, stock: 15, categoria: 'Aseo personal' },
  ];

  for (const p of products) {
    await productUseCases.createProduct({
      name: p.name,
      price: p.price,
      stock: p.stock,
      categoryId: categories[p.categoria].id,
    });
  }
}
