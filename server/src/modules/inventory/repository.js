import { requireDatabase } from '../../db/knex.js';

/**
 * Executes a callback within a managed database transaction.
 *
 * @param {Function} callback - Async function that receives the active transaction client.
 * @returns {Promise<any>} Result of the transaction callback execution.
 */
export async function runInTransaction(callback) {
  const db = requireDatabase();
  return await db.transaction(callback);
}

/**
 * Constructs the base query joining active products with their respective categories.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Knex query builder instance.
 */
function inventoryBase(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  return db('products as p').join('categories as c', 'c.id', 'p.category_id');
}

/**
 * Applies search, category, and low stock filters to an inventory query.
 *
 * @param {import('knex').Knex.QueryBuilder} query - Query builder instance to modify.
 * @param {Object} filters - Filter criteria.
 * @param {string} [filters.category_id] - Filter by specific category ID.
 * @param {string} [filters.low_stock] - Filter products where stock_qty <= reorder_level ('true').
 * @param {string} [filters.q] - Free-text search matching SKU or product name.
 * @returns {void}
 */
function applyInventoryFilters(query, filters) {
  query.where('p.status', 'active');

  if (filters.category_id) {
    query.where('p.category_id', filters.category_id);
  }

  if (filters.low_stock === 'true') {
    query.whereRaw('p.stock_qty <= p.reorder_level');
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
 * Locks a product row for update within an active database transaction.
 * Uses SELECT ... FOR UPDATE to avoid concurrent race conditions during stock mutations.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number|string} id - Product primary key.
 * @returns {Promise<Object|undefined>} Locked product record, or undefined if not found.
 */
export function lockProduct(trx, id) {
  return trx('products')
    .where({ id })
    .forUpdate()
    .first();
}

/**
 * Updates a product's current stock quantity and modification timestamp.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number|string} id - Product primary key.
 * @param {number} quantity - New stock balance.
 * @returns {Promise<Array<{ id: number, stock_qty: number }>>} Updated product fields.
 */
export function updateProductStock(trx, id, quantity) {
  return trx('products')
    .where({ id })
    .update({
      stock_qty: quantity,
      updated_at: trx.fn.now(),
    })
    .returning(['id', 'stock_qty']);
}

/**
 * Inserts an immutable stock movement transaction record into the inventory ledger.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Object} movementData - Movement details.
 * @param {number|string} movementData.productId - Affected product ID.
 * @param {string} movementData.type - Movement type (e.g. 'stock_in', 'adjustment', 'sale').
 * @param {number} movementData.quantityChange - Signed stock change (+ or -).
 * @param {number} movementData.balanceAfter - Ending stock balance after this transaction.
 * @param {string} [movementData.reason] - Human-readable reason or note.
 * @param {number} movementData.userId - User initiating the transaction.
 * @returns {Promise<Array<{ id: number, created_at: Date }>>} Inserted movement identifier and timestamp.
 */
export function insertMovement(trx, { productId, type, quantityChange, balanceAfter, reason, userId }) {
  return trx('inventory_transactions')
    .insert({
      product_id: productId,
      type,
      quantity_change: quantityChange,
      balance_after: balanceAfter,
      reason: reason || null,
      user_id: userId,
    })
    .returning(['id', 'created_at']);
}

/**
 * Retrieves paginated product inventory rows based on applied filters.
 * Cost price and calculated stock value are conditionally included only for Admin users.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {Object} user - Requesting user with role information.
 * @param {Object} filters - Search and pagination filters.
 * @returns {Promise<Array<Object>>} List of product inventory rows.
 */
export function inventoryRows(trxOrDb, user, filters) {
  const db = trxOrDb || requireDatabase();
  const query = inventoryBase(db).select(
    'p.id',
    'p.sku',
    'p.name',
    'p.category_id',
    'c.name as category_name',
    'p.stock_qty',
    'p.reorder_level',
    'p.status'
  );

  if (user.role === 'admin') {
    query.select('p.cost_price');
    query.select(db.raw('round(p.cost_price * p.stock_qty, 2) as stock_value'));
  }

  applyInventoryFilters(query, filters);

  const pageSize = filters.page_size;
  const offset = (filters.page - 1) * pageSize;

  return query
    .orderBy('p.name', 'asc')
    .orderBy('p.id', 'asc')
    .limit(pageSize)
    .offset(offset);
}

/**
 * Computes aggregated inventory summary metrics including total stock units,
 * count of low stock items, and total distinct products matching filters.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {Object} filters - Search and category filters.
 * @returns {Promise<{ total_units: number, low_stock_count: number, product_count: number }>} Aggregated summary metrics.
 */
export function inventorySummary(trxOrDb, filters) {
  const db = trxOrDb || requireDatabase();
  const query = inventoryBase(db).select(
    db.raw('COALESCE(SUM(p.stock_qty), 0) as total_units'),
    db.raw('COALESCE(SUM(CASE WHEN p.stock_qty <= p.reorder_level THEN 1 ELSE 0 END), 0) as low_stock_count'),
    db.raw('COUNT(p.id) as product_count')
  );

  applyInventoryFilters(query, filters);

  return query.first();
}

/**
 * Retrieves paginated stock movement transactions with joined product and user details.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {Object} filters - Movement query filters (type, dates, pagination).
 * @param {number|string} [productId] - Optional specific product ID to filter by.
 * @returns {Promise<Array<Object>>} List of stock movement rows.
 */
export function movementRows(trxOrDb, filters, productId) {
  const db = trxOrDb || requireDatabase();

  const query = db('inventory_transactions as it')
    .join('products as p', 'p.id', 'it.product_id')
    .join('users as u', 'u.id', 'it.user_id')
    .select(
      'it.id',
      'it.product_id',
      'p.sku',
      'p.name as product_name',
      'it.type',
      'it.quantity_change',
      'it.balance_after',
      'it.reason',
      'it.created_at',
      'u.full_name as user_name'
    );

  if (productId) {
    query.where('it.product_id', productId);
  }

  if (filters.type) {
    query.where('it.type', filters.type);
  }

  if (filters.from) {
    query.where('it.created_at', '>=', filters.from);
  }

  if (filters.to) {
    query.where('it.created_at', '<=', filters.to);
  }

  const timeZone = filters.timeZone || 'UTC';

  if (filters.from_date) {
    query.whereRaw('(it.created_at AT TIME ZONE ?)::date >= ?::date', [timeZone, filters.from_date]);
  }

  if (filters.to_date) {
    query.whereRaw('(it.created_at AT TIME ZONE ?)::date <= ?::date', [timeZone, filters.to_date]);
  }

  const pageSize = filters.page_size;
  const offset = (filters.page - 1) * pageSize;

  return query
    .orderBy('it.created_at', 'desc')
    .orderBy('it.id', 'desc')
    .limit(pageSize)
    .offset(offset);
}

/**
 * Counts the total number of movement transactions matching specified filters.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {Object} filters - Movement query filters.
 * @param {number|string} [productId] - Optional specific product ID to filter by.
 * @returns {Promise<{ count: number }>} Total matching records count.
 */
export function countMovements(trxOrDb, filters, productId) {
  const db = trxOrDb || requireDatabase();

  const query = db('inventory_transactions as it')
    .count('it.id as count');

  if (productId) {
    query.where('it.product_id', productId);
  }

  if (filters.type) {
    query.where('it.type', filters.type);
  }

  if (filters.from) {
    query.where('it.created_at', '>=', filters.from);
  }

  if (filters.to) {
    query.where('it.created_at', '<=', filters.to);
  }

  const timeZone = filters.timeZone || 'UTC';

  if (filters.from_date) {
    query.whereRaw('(it.created_at AT TIME ZONE ?)::date >= ?::date', [timeZone, filters.from_date]);
  }

  if (filters.to_date) {
    query.whereRaw('(it.created_at AT TIME ZONE ?)::date <= ?::date', [timeZone, filters.to_date]);
  }

  return query.first();
}

/**
 * Checks whether a product with the specified primary key exists.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {number|string} id - Product primary key.
 * @returns {Promise<{ id: number }|undefined>} Found record identifier or undefined.
 */
export function productExists(trxOrDb, id) {
  const db = trxOrDb || requireDatabase();
  return db('products')
    .where({ id })
    .first('id');
}

/**
 * Retrieves the configured store time zone from the system settings table.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Database client or transaction.
 * @returns {Promise<string>} Store time zone string (defaults to 'UTC' if not found).
 */
export async function findStoreTimeZone(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const setting = await db('settings')
    .where({ key: 'time_zone' })
    .first('value');

  return setting?.value ?? 'UTC';
}

/**
 * Writes an inventory-related action entry into the system audit log.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number} actorId - ID of the user performing the operation.
 * @param {number|string} productId - Affected product ID.
 * @param {string} action - Action descriptor (e.g. 'inventory.stock_in', 'inventory.adjusted').
 * @param {Object} details - Structured JSON details of the action.
 * @returns {Promise<void>}
 */
export function writeInventoryAudit(trx, actorId, productId, action, details) {
  return trx('audit_logs').insert({
    user_id: actorId,
    action,
    entity_type: 'product',
    entity_id: productId,
    details,
  });
}
