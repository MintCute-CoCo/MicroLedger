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
 * Acquires a PostgreSQL transaction-scoped advisory lock on an idempotency key string.
 * Prevents race conditions during concurrent requests with identical idempotency headers.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {string} key - Idempotency key identifier.
 * @returns {Promise<any>} Raw advisory lock execution result.
 */
export function lockIdempotencyKey(trx, key) {
  return trx.raw('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [key]);
}

/**
 * Finds an existing sale by its idempotency key.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {string} key - Idempotency key string.
 * @returns {Promise<{ id: number }|undefined>} Found sale record or undefined.
 */
export function findSaleByIdempotencyKey(trxOrDb, key) {
  const db = trxOrDb || requireDatabase();
  return db('sales').where({ idempotency_key: key }).first('id');
}

/**
 * Retrieves a sale record by primary key ID, with an optional SELECT ... FOR UPDATE row lock.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {number|string} id - Sale primary key.
 * @param {boolean} [lock=false] - Whether to apply row locking.
 * @returns {Promise<Object|undefined>} Sale record or undefined.
 */
export function findSaleById(trxOrDb, id, lock = false) {
  const db = trxOrDb || requireDatabase();
  const query = db('sales').where({ id }).first();

  if (lock) {
    return query.forUpdate();
  }
  return query;
}

/**
 * Checks if a customer exists by primary key ID.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {number|string} id - Customer primary key.
 * @returns {Promise<{ id: number }|undefined>} Customer record or undefined.
 */
export function findSaleCustomer(trxOrDb, id) {
  const db = trxOrDb || requireDatabase();
  return db('customers').where({ id }).first('id');
}

/**
 * Locks product rows in ascending ID order within a transaction.
 * Ascending ordering guarantees deadlock prevention across concurrent sales.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Array<number|string>} ids - Product primary key IDs to lock.
 * @returns {Promise<Array<Object>>} Locked product records.
 */
export function lockSaleProducts(trx, ids) {
  return trx('products')
    .whereIn('id', ids)
    .orderBy('id', 'asc')
    .forUpdate();
}

/**
 * Atomically deducts sold quantity from product stock, ensuring stock does not drop below zero.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number|string} productId - Product primary key.
 * @param {number} quantity - Quantity to deduct.
 * @returns {Promise<Array<{ id: number, stock_qty: number }>>} Updated product fields.
 */
export function deductStock(trx, productId, quantity) {
  return trx('products')
    .where({ id: productId, status: 'active' })
    .where('stock_qty', '>=', quantity)
    .update({
      stock_qty: trx.raw('stock_qty - ?', [quantity]),
      updated_at: trx.fn.now(),
    })
    .returning(['id', 'stock_qty']);
}

/**
 * Sets the absolute stock quantity for a product.
 * Used during void reversals to restore previously sold inventory.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number|string} productId - Product primary key.
 * @param {number} stockQty - New stock quantity to set.
 * @returns {Promise<number>} Number of updated rows.
 */
export function updateStock(trx, productId, stockQty) {
  return trx('products')
    .where({ id: productId })
    .update({
      stock_qty: stockQty,
      updated_at: trx.fn.now(),
    });
}

/**
 * Inserts a master sale record into the sales table.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Object} sale - Sale header data to insert.
 * @returns {Promise<Array<Object>>} Inserted sale record.
 */
export function insertSale(trx, sale) {
  return trx('sales').insert(sale).returning('*');
}

/**
 * Inserts item lines associated with a completed sale transaction.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Array<Object>} items - Array of sale item records.
 * @returns {Promise<Array<Object>>} Inserted sale item records with IDs.
 */
export function insertSaleItems(trx, items) {
  return trx('sale_items').insert(items).returning('*');
}

/**
 * Inserts an inventory ledger transaction record tied to a sale or void reversal.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Object} transactionData - Inventory ledger row payload.
 * @returns {Promise<void>}
 */
export function insertSaleInventoryTransaction(trx, transactionData) {
  return trx('inventory_transactions').insert(transactionData);
}

/**
 * Retrieves the configured store time zone from settings.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<string>} Configured store time zone or 'UTC'.
 */
export async function findStoreTimeZone(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const setting = await db('settings')
    .where({ key: 'time_zone' })
    .first('value');

  return setting?.value ?? 'UTC';
}

/**
 * Computes the calendar start date for a sale in the store's configured time zone.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number|string} saleId - Primary key of the completed sale.
 * @param {string} timeZone - Configured store time zone.
 * @returns {Promise<string>} Start date string in YYYY-MM-DD format.
 */
export async function getSaleStartDate(trx, saleId, timeZone) {
  const startResult = await trx.raw(
    'select (sold_at at time zone ?)::date as start_date from sales where id = ?',
    [timeZone, saleId]
  );

  return startResult.rows[0].start_date;
}

/**
 * Inserts serial numbers tracked for sold product units.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Array<Object>} serials - Serial records to insert.
 * @returns {Promise<void>}
 */
export function insertSaleItemSerials(trx, serials) {
  return trx('sale_item_serials').insert(serials);
}

/**
 * Inserts active warranty records generated from a completed sale.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Array<Object>} warranties - Warranty records to insert.
 * @returns {Promise<void>}
 */
export function insertSaleWarranties(trx, warranties) {
  return trx('warranties').insert(warranties);
}

/**
 * Checks whether any sale items belong to an active, non-cancelled warranty claim.
 * Prevents voiding sales that have associated open warranty claims.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Array<number|string>} saleItemIds - IDs of sale item rows.
 * @returns {Promise<Object|undefined>} First active claim found, or undefined.
 */
export function findActiveWarrantyClaimForSaleItems(trx, saleItemIds) {
  return trx('warranty_claims as wc')
    .join('warranties as w', 'w.id', 'wc.warranty_id')
    .whereIn('w.sale_item_id', saleItemIds)
    .whereNot('wc.status', 'Cancelled')
    .first('wc.id');
}

/**
 * Updates a sale's status to 'voided' and records cancellation details.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number|string} saleId - Target sale primary key.
 * @param {number} actorId - Admin user performing the void.
 * @param {string} reason - Justification reason for voiding.
 * @returns {Promise<number>} Number of updated rows.
 */
export function markSaleVoided(trx, saleId, actorId, reason) {
  return trx('sales')
    .where({ id: saleId })
    .update({
      status: 'voided',
      voided_by: actorId,
      voided_at: trx.fn.now(),
      void_reason: reason,
    });
}

/**
 * Releases captured serial numbers when a sale is voided.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Array<number|string>} saleItemIds - IDs of affected sale item rows.
 * @returns {Promise<number>} Number of updated rows.
 */
export function releaseSaleItemSerials(trx, saleItemIds) {
  return trx('sale_item_serials')
    .whereIn('sale_item_id', saleItemIds)
    .whereNull('released_at')
    .update({
      released_at: trx.fn.now(),
    });
}

/**
 * Retrieves all sale items associated with a given sale ID.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {number|string} saleId - Sale primary key.
 * @returns {Promise<Array<Object>>} Line items ordered by ID.
 */
export function saleItems(trxOrDb, saleId) {
  const db = trxOrDb || requireDatabase();
  return db('sale_items')
    .where({ sale_id: saleId })
    .orderBy('id', 'asc');
}

/**
 * Inserts an audit trail log entry for a sale event.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number} actorId - User ID who triggered the action.
 * @param {number|string} saleId - Affected sale ID.
 * @param {string} action - Action descriptor (e.g. 'sale.completed', 'sale.voided').
 * @param {Object} details - Structured JSON details.
 * @returns {Promise<void>}
 */
export function writeSaleAudit(trx, actorId, saleId, action, details) {
  return trx('audit_logs').insert({
    user_id: actorId,
    action,
    entity_type: 'sale',
    entity_id: saleId,
    details,
  });
}

/**
 * Retrieves detailed sale information joined with customer and cashier details.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {number|string} id - Sale primary key.
 * @returns {Promise<Object|undefined>} Detailed sale header or undefined.
 */
export function saleDetailsQuery(trxOrDb, id) {
  const db = trxOrDb || requireDatabase();
  return db('sales as s')
    .leftJoin('customers as c', 'c.id', 's.customer_id')
    .join('users as u', 'u.id', 's.user_id')
    .select(
      's.*',
      'c.name as customer_name',
      'c.phone as customer_phone',
      'u.full_name as staff_name'
    )
    .where('s.id', id)
    .first();
}

/**
 * Applies search, date range, user, customer, payment method, and amount filters to a sales query.
 *
 * @param {import('knex').Knex.QueryBuilder} query - Query builder to modify.
 * @param {Object} filters - Applied filter criteria.
 * @returns {void}
 */
function applySaleFilters(query, filters) {
  if (filters.status && filters.status !== 'all') {
    query.where('s.status', filters.status);
  }

  if (filters.from) {
    query.where('s.sold_at', '>=', filters.from);
  }

  if (filters.to) {
    query.where('s.sold_at', '<=', filters.to);
  }

  const timeZone = filters.timeZone || 'UTC';

  if (filters.from_date) {
    query.whereRaw('(s.sold_at AT TIME ZONE ?)::date >= ?::date', [timeZone, filters.from_date]);
  }

  if (filters.to_date) {
    query.whereRaw('(s.sold_at AT TIME ZONE ?)::date <= ?::date', [timeZone, filters.to_date]);
  }

  if (filters.user_id) {
    query.where('s.user_id', filters.user_id);
  }

  if (filters.customer_id) {
    query.where('s.customer_id', filters.customer_id);
  }

  if (filters.payment_method) {
    query.where('s.payment_method', filters.payment_method);
  }

  if (filters.min_total !== undefined) {
    query.where('s.total', '>=', filters.min_total);
  }

  if (filters.max_total !== undefined) {
    query.where('s.total', '<=', filters.max_total);
  }

  if (filters.q) {
    const escapedQuery = filters.q.replace(/[\\%_]/g, '\\$&');
    const searchPattern = `%${escapedQuery}%`;

    query.where((builder) => {
      builder
        .whereRaw("s.sale_no ILIKE ? ESCAPE E'\\\\'", [searchPattern])
        .orWhereExists((subquery) =>
          subquery
            .select(1)
            .from('customers as search_customer')
            .whereRaw('search_customer.id = s.customer_id')
            .whereRaw("search_customer.name ILIKE ? ESCAPE E'\\\\'", [searchPattern])
        )
        .orWhereExists((subquery) =>
          subquery
            .select(1)
            .from('users as search_user')
            .whereRaw('search_user.id = s.user_id')
            .whereRaw("search_user.full_name ILIKE ? ESCAPE E'\\\\'", [searchPattern])
        );
    });
  }
}

/**
 * Retrieves a paginated list of sales history headers matching filter criteria.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {Object} filters - Search and pagination filters.
 * @returns {Promise<Array<Object>>} List of sales records.
 */
export function salesListQuery(trxOrDb, filters) {
  const db = trxOrDb || requireDatabase();

  const query = db('sales as s')
    .leftJoin('customers as c', 'c.id', 's.customer_id')
    .join('users as u', 'u.id', 's.user_id')
    .select(
      's.id',
      's.user_id',
      's.sale_no',
      's.sold_at',
      's.subtotal',
      's.discount_amount',
      's.total',
      's.payment_method',
      's.status',
      's.customer_id',
      'c.name as customer_name',
      'u.full_name as staff_name'
    );

  applySaleFilters(query, filters);

  const pageSize = filters.page_size;
  const offset = (filters.page - 1) * pageSize;

  return query
    .orderBy('s.sold_at', 'desc')
    .orderBy('s.id', 'desc')
    .limit(pageSize)
    .offset(offset);
}

/**
 * Counts total sales records matching filter criteria.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {Object} filters - Search filters.
 * @returns {Promise<{ count: number }>} Matching sales count.
 */
export function salesCountQuery(trxOrDb, filters) {
  const db = trxOrDb || requireDatabase();
  const query = db('sales as s').count('s.id as count');

  applySaleFilters(query, filters);
  return query.first();
}

/**
 * Retrieves distinct staff users who have created sales transactions, for filtering dropdowns.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @returns {Promise<Array<{ id: number, full_name: string }>>} Distinct users list.
 */
export function salesUserFilterOptions(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  return db('sales as s')
    .join('users as u', 'u.id', 's.user_id')
    .distinct('u.id', 'u.full_name')
    .orderBy('u.full_name', 'asc');
}
