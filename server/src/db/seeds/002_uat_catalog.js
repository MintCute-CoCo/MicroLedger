const PRODUCT_COUNT = 500;
const CATEGORY_NAMES = [
  'UAT Audio', 'UAT Computing', 'UAT Home', 'UAT Lighting', 'UAT Mobile',
  'UAT Networking', 'UAT Office', 'UAT Storage', 'UAT Tools', 'UAT Accessories',
];

/** Optional fixture for a local or UAT database; never runs with the normal seed. */
export async function seed(knex) {
  if (process.env.UAT_SEED_CONFIRM !== 'YES') {
    throw new Error('Set UAT_SEED_CONFIRM=YES to add the 500-product UAT catalogue');
  }

  await knex.transaction(async (trx) => {
    const admin = await trx('users')
      .where({ role: 'admin', status: 'active' })
      .orderBy('id', 'asc')
      .first('id');
    if (!admin) throw new Error('An active Admin is required before seeding UAT products');

    const categories = new Map();
    for (const name of CATEGORY_NAMES) {
      let category = await trx('categories').whereRaw('lower(name) = lower(?)', [name]).first('id');
      if (!category) {
        [category] = await trx('categories').insert({ name, description: 'Sample catalogue for UAT' }).returning('id');
      }
      categories.set(name, category.id);
    }

    const skuList = Array.from({ length: PRODUCT_COUNT }, (_, index) => `UAT-${String(index + 1).padStart(4, '0')}`);
    const existingRows = await trx('products')
      .whereRaw('lower(sku) = ANY(?)', [skuList.map((sku) => sku.toLowerCase())])
      .select('sku');
    const existing = new Set(existingRows.map(({ sku }) => sku.toUpperCase()));
    const products = skuList.flatMap((sku, offset) => {
      if (existing.has(sku)) return [];
      const index = offset + 1;
      const categoryName = CATEGORY_NAMES[offset % CATEGORY_NAMES.length];
      return [{
        sku,
        name: `Sample ${categoryName.slice(4)} Product ${String(index).padStart(3, '0')}`,
        category_id: categories.get(categoryName),
        unit: 'pcs',
        cost_price: (5 + (index % 30)).toFixed(2),
        selling_price: (40 + (index % 120)).toFixed(2),
        stock_qty: index % 17 === 0 ? 3 : 8 + (index % 43),
        reorder_level: 5,
        warranty_months: [0, 6, 12, 24][index % 4],
        tracks_serial: index % 25 === 0,
      }];
    });

    if (products.length === 0) return;
    const inserted = await trx('products').insert(products).returning(['id', 'stock_qty']);
    await trx('inventory_transactions').insert(inserted.map((product) => ({
      product_id: product.id,
      type: 'opening',
      quantity_change: product.stock_qty,
      balance_after: product.stock_qty,
      reason: 'UAT sample opening stock',
      user_id: admin.id,
    })));
  });
}
