import { requireDatabase } from '../../db/knex.js';

/**
 * Executes a callback within a managed database transaction.
 *
 * @param {Function} callback - Async function that receives the active transaction client.
 * @returns {Promise<any>} Result of the callback execution.
 */
export async function runInTransaction(callback) {
  const db = requireDatabase();
  return await db.transaction(callback);
}

/**
 * Constructs the base query joining products with their corresponding category records.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex instance or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Knex query builder instance.
 */
function productsBase(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  return db('products as p').join('categories as c', 'c.id', 'p.category_id');
}

/**
 * Retrieves a category record by primary key ID, with an optional row lock.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex instance or transaction.
 * @param {number|string} id - Category primary key.
 * @param {boolean} [lock=false] - Whether to apply SELECT ... FOR UPDATE.
 * @returns {Promise<Object|undefined>} Category record or undefined.
 */
export function findCategory(trxOrDb, id, lock = false) {
  const db = trxOrDb || requireDatabase();
  const query = db('categories').where({ id }).first();

  if (lock) {
    return query.forUpdate();
  }
  return query;
}

/**
 * Inserts a new product catalog row into the database.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Object} product - Product record to insert.
 * @returns {Promise<Array<Object>>} Inserted product record.
 */
export function insertProduct(trx, product) {
  return trx('products')
    .insert(product)
    .returning('*');
}

/**
 * Retrieves a product record joined with its category information, with optional row locking.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex instance or transaction.
 * @param {number|string} id - Product primary key.
 * @param {boolean} [lock=false] - Whether to apply SELECT ... FOR UPDATE on table 'p'.
 * @returns {Promise<Object|undefined>} Product record with category metadata or undefined.
 */
export function selectProduct(trxOrDb, id, lock = false) {
  const db = trxOrDb || requireDatabase();
  const query = db('products as p')
    .join('categories as c', 'c.id', 'p.category_id')
    .select(
      'p.*',
      'c.name as category_name',
      'c.status as category_status'
    )
    .where('p.id', id)
    .first();

  if (lock) {
    return query.forUpdate('p');
  }
  return query;
}

/**
 * Applies search, category, low stock, price range, and status filters to a product query.
 *
 * @param {import('knex').Knex.QueryBuilder} query - Query builder instance to modify.
 * @param {Object} user - Requesting user with role information.
 * @param {Object} filters - Applied filter criteria.
 * @returns {void}
 */
function applyProductFilters(query, user, filters) {
  // Staff users can only view active products; Admins can filter by active, inactive, or all
  const status = user.role === 'admin' ? (filters.status ?? 'active') : 'active';
  if (status !== 'all') {
    query.where('p.status', status);
  }

  if (filters.category_id) {
    query.where('p.category_id', filters.category_id);
  }

  if (filters.low_stock === 'true') {
    query.whereRaw('p.stock_qty <= p.reorder_level');
  }

  if (filters.min_stock !== undefined) {
    query.where('p.stock_qty', '>=', filters.min_stock);
  }

  if (filters.max_stock !== undefined) {
    query.where('p.stock_qty', '<=', filters.max_stock);
  }

  if (filters.min_price !== undefined) {
    query.where('p.selling_price', '>=', filters.min_price);
  }

  if (filters.max_price !== undefined) {
    query.where('p.selling_price', '<=', filters.max_price);
  }

  if (filters.q) {
    const escapedQuery = filters.q.replace(/[\\%_]/g, '\\$&');
    const searchPattern = `%${escapedQuery}%`;
    query.whereRaw(
      "(p.sku ILIKE ? ESCAPE E'\\\\' OR p.name ILIKE ? ESCAPE E'\\\\')",
      [searchPattern, searchPattern]
    );
  }
}

/**
 * Builds the query to retrieve filtered and sorted products for catalog listing.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex instance or transaction.
 * @param {Object} user - Requesting user.
 * @param {Object} filters - Search, sorting, and filter criteria.
 * @returns {import('knex').Knex.QueryBuilder} Executable query builder.
 */
export function listProductsQuery(trxOrDb, user, filters) {
  const query = productsBase(trxOrDb).select(
    'p.id',
    'p.sku',
    'p.name',
    'p.category_id',
    'c.name as category_name',
    'p.unit',
    'p.cost_price',
    'p.selling_price',
    'p.stock_qty',
    'p.reorder_level',
    'p.warranty_months',
    'p.tracks_serial',
    'p.status',
    'p.created_at',
    'p.updated_at'
  );

  applyProductFilters(query, user, filters);

  const orderColumns = {
    name: 'p.name',
    sku: 'p.sku',
    stock: 'p.stock_qty',
  };

  const sortColumn = orderColumns[filters.sort] || 'p.name';
  const direction = filters.direction || 'asc';

  return query
    .orderBy(sortColumn, direction)
    .orderBy('p.id', 'asc');
}

/**
 * Counts total product records matching applied catalog filters.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex instance or transaction.
 * @param {Object} user - Requesting user.
 * @param {Object} filters - Search and filter criteria.
 * @returns {Promise<{ count: number }>} Total matching products count.
 */
export function countProductsQuery(trxOrDb, user, filters) {
  const query = productsBase(trxOrDb).count('p.id as count');
  applyProductFilters(query, user, filters);
  return query.first();
}

/**
 * Performs fast POS ranked search against active products.
 * Exact SKU matches rank highest (0), followed by prefix SKU (1), prefix name (2), then others (3).
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex instance or transaction.
 * @param {string} queryText - Search string.
 * @returns {Promise<Array<Object>>} Top 20 ranked active products.
 */
export function lookupProductsQuery(trxOrDb, queryText) {
  const escapedQuery = queryText.replace(/[\\%_]/g, '\\$&');
  const searchPattern = `%${escapedQuery}%`;
  const prefixPattern = `${escapedQuery}%`;

  return productsBase(trxOrDb)
    .select(
      'p.id',
      'p.sku',
      'p.name',
      'p.category_id',
      'c.name as category_name',
      'p.unit',
      'p.selling_price',
      'p.stock_qty',
      'p.reorder_level',
      'p.status'
    )
    .where('p.status', 'active')
    .whereRaw(
      "(p.sku ILIKE ? ESCAPE E'\\\\' OR p.name ILIKE ? ESCAPE E'\\\\')",
      [searchPattern, searchPattern]
    )
    .orderByRaw(
      'CASE WHEN lower(p.sku) = lower(?) THEN 0 WHEN lower(p.sku) LIKE lower(?) THEN 1 WHEN lower(p.name) LIKE lower(?) THEN 2 ELSE 3 END',
      [queryText, prefixPattern, prefixPattern]
    )
    .orderBy('p.name', 'asc')
    .limit(20);
}

/**
 * Records an opening stock movement entry in the inventory ledger.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Object} movementData - Opening inventory details.
 * @param {number|string} movementData.productId - Product primary key.
 * @param {number} movementData.quantity - Initial opening stock quantity.
 * @param {number} movementData.userId - User who created the product.
 * @returns {Promise<void>}
 */
export function insertOpeningMovement(trx, { productId, quantity, userId }) {
  return trx('inventory_transactions').insert({
    product_id: productId,
    type: 'opening',
    quantity_change: quantity,
    balance_after: quantity,
    reason: 'Opening stock',
    user_id: userId,
  });
}

/**
 * Updates a product catalog row with specified column modifications.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number|string} id - Product primary key.
 * @param {Object} changes - Field modifications to apply.
 * @returns {Promise<Array<Object>>} Updated product record.
 */
export function updateProductRow(trx, id, changes) {
  return trx('products')
    .where({ id })
    .update({
      ...changes,
      updated_at: trx.fn.now(),
    })
    .returning('*');
}

/**
 * Inserts an audit log entry for product-related lifecycle events.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number} actorId - User ID who triggered the action.
 * @param {number|string} productId - Affected product ID.
 * @param {string} action - Action descriptor (e.g. 'product.created', 'product.updated').
 * @param {Object} details - Structured JSON event details.
 * @returns {Promise<void>}
 */
export function insertProductAudit(trx, actorId, productId, action, details) {
  return trx('audit_logs').insert({
    user_id: actorId,
    action,
    entity_type: 'product',
    entity_id: productId,
    details,
  });
}
