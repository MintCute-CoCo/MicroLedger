/**
 * Exports Repository
 *
 * Handles database extraction queries for file and report exports.
 * Adheres strictly to the architectural rule: "Repositories do SQL only."
 */

/**
 * Retrieves the configured store time zone from infrastructure environment variable (SRS-SET-01).
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} [_db] - Knex database or transaction instance.
 * @returns {Promise<string>} Configured time zone string from infrastructure TZ or 'UTC'.
 */
export async function findStoreTimeZone(_db) {
  return process.env.TZ || 'UTC';
}

/**
 * Extracts product or inventory records for export.
 *
 * Purpose:
 * Queries the products table joined with category names, applying search
 * and threshold filters, with an optional cost price column for inventory exports.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} query - Validated search and filter parameters.
 * @param {boolean} [includeCostPrice=false] - Whether to include confidential cost price data.
 * @returns {Promise<Array<Object>>} List of matching product records up to 50,001 rows.
 */
export async function fetchProductsExportRows(db, query, includeCostPrice = false) {
  const builder = db('products as p');

  // Left join categories to display category name instead of raw ID
  builder.leftJoin('categories as c', 'c.id', 'p.category_id');

  // Select base catalog columns
  builder.select(
    'p.sku',
    'p.name',
    'c.name as category',
    'p.unit',
    'p.selling_price',
    'p.stock_qty',
    'p.reorder_level',
    'p.status'
  );

  // Include cost price only when explicitly requested (e.g., inventory exports for Admin)
  if (includeCostPrice) {
    builder.select('p.cost_price');
  }

  // Filter by product lifecycle status if specified and not 'all'
  if (query.status && query.status !== 'all') {
    builder.where('p.status', query.status);
  }

  // Filter by category ID
  if (query.category_id) {
    builder.where('p.category_id', query.category_id);
  }

  // Keyword search across SKU and product name
  if (query.q) {
    const searchPattern = `%${query.q}%`;
    builder.where((subquery) => {
      subquery.whereILike('p.sku', searchPattern);
      subquery.orWhereILike('p.name', searchPattern);
    });
  }

  // Filter for products at or below reorder level
  if (query.low_stock === 'true') {
    builder.whereRaw('p.stock_qty <= p.reorder_level');
  }

  // Stock quantity boundaries
  if (query.min_stock !== undefined) {
    builder.where('p.stock_qty', '>=', query.min_stock);
  }
  if (query.max_stock !== undefined) {
    builder.where('p.stock_qty', '<=', query.max_stock);
  }

  // Selling price boundaries
  if (query.min_price !== undefined) {
    builder.where('p.selling_price', '>=', query.min_price);
  }
  if (query.max_price !== undefined) {
    builder.where('p.selling_price', '<=', query.max_price);
  }

  // Order alphabetically and fetch up to 50,001 rows to test export limit
  builder.orderBy('p.name', 'desc');
  builder.limit(50001);

  const rows = await builder;
  return rows;
}

/**
 * Extracts sales records for export within a specified date range.
 *
 * Purpose:
 * Queries the sales table joined with customers and staff users, applying date range,
 * payment method, total range, and search filters.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} query - Validated search and filter parameters.
 * @param {string} timeZone - Configured store time zone.
 * @returns {Promise<Array<Object>>} List of sales records up to 50,001 rows.
 */
export async function fetchSalesExportRows(db, query, timeZone) {
  const builder = db('sales as s');

  // Join customers and staff users
  builder.leftJoin('customers as c', 'c.id', 's.customer_id');
  builder.join('users as u', 'u.id', 's.user_id');

  // Select standard sale attributes
  builder.select(
    's.sale_no',
    's.sold_at',
    'c.name as customer',
    'u.full_name as staff',
    's.payment_method',
    's.subtotal',
    's.discount_amount',
    's.total',
    's.status'
  );

  // Exact timestamp filters
  if (query.from) {
    builder.where('s.sold_at', '>=', query.from);
  }
  if (query.to) {
    builder.where('s.sold_at', '<=', query.to);
  }

  // Store-local calendar date filters
  if (query.from_date) {
    builder.whereRaw('(s.sold_at AT TIME ZONE ?)::date >= ?::date', [timeZone, query.from_date]);
  }
  if (query.to_date) {
    builder.whereRaw('(s.sold_at AT TIME ZONE ?)::date <= ?::date', [timeZone, query.to_date]);
  }

  // Status and payment method filters
  if (query.status && query.status !== 'all') {
    builder.where('s.status', query.status);
  }
  if (query.payment_method) {
    builder.where('s.payment_method', query.payment_method);
  }

  // Relational filters
  if (query.user_id) {
    builder.where('s.user_id', query.user_id);
  }
  if (query.customer_id) {
    builder.where('s.customer_id', query.customer_id);
  }

  // Total sale amount boundaries
  if (query.min_total !== undefined) {
    builder.where('s.total', '>=', query.min_total);
  }
  if (query.max_total !== undefined) {
    builder.where('s.total', '<=', query.max_total);
  }

  // Search keyword across sale number, customer name, and staff name
  if (query.q) {
    const searchPattern = `%${query.q}%`;
    builder.where((subquery) => {
      subquery.whereILike('s.sale_no', searchPattern);
      subquery.orWhereILike('c.name', searchPattern);
      subquery.orWhereILike('u.full_name', searchPattern);
    });
  }

  // Order newest sales first and limit to 50,001 rows
  builder.orderBy('s.sold_at', 'desc');
  builder.limit(50001);

  const rows = await builder;
  return rows;
}

/**
 * Extracts warranty claims records for export.
 *
 * Purpose:
 * Queries warranty claims joined with warranties, products, customers, and suppliers,
 * applying status, supplier, date, overdue, and keyword filters.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} query - Validated search and filter parameters.
 * @param {string} timeZone - Configured store time zone.
 * @returns {Promise<Array<Object>>} List of claim records up to 50,001 rows.
 */
export async function fetchClaimsExportRows(db, query, timeZone) {
  const builder = db('warranty_claims as cl');

  // Relational joins
  builder.join('warranties as w', 'w.id', 'cl.warranty_id');
  builder.join('products as p', 'p.id', 'w.product_id');
  builder.join('customers as c', 'c.id', 'cl.customer_id');
  builder.leftJoin('suppliers as sp', 'sp.id', 'cl.supplier_id');

  // Select claim export attributes
  builder.select(
    'cl.claim_no',
    'cl.claim_date',
    'cl.status',
    'p.sku',
    'p.name as product',
    'c.name as customer',
    'c.phone as phone',
    'sp.name as supplier',
    'cl.expected_return_date',
    'cl.actual_return_date',
    'cl.problem',
    'cl.resolution',
    'cl.notes'
  );

  // Status filter (ignoring product-specific status enums)
  const nonClaimStatuses = ['all', 'active', 'inactive', 'completed', 'voided'];
  if (query.status && !nonClaimStatuses.includes(query.status)) {
    builder.where('cl.status', query.status);
  }

  // Supplier and date filters
  if (query.supplier_id) {
    builder.where('cl.supplier_id', query.supplier_id);
  }
  if (query.from_date) {
    builder.where('cl.claim_date', '>=', query.from_date);
  }
  if (query.to_date) {
    builder.where('cl.claim_date', '<=', query.to_date);
  }

  // Customer phone filter
  if (query.phone) {
    const phonePattern = `%${query.phone}%`;
    builder.whereILike('c.phone', phonePattern);
  }

  // Filter for overdue claims: with supplier, not returned, and expected return < store today
  if (query.overdue === 'true') {
    builder.where('cl.status', 'With Supplier');
    builder.whereNull('cl.actual_return_date');
    builder.whereRaw('cl.expected_return_date < (now() AT TIME ZONE ?)::date', [timeZone]);
  }

  // Keyword search across claim number, customer, phone, SKU, and product name
  if (query.q) {
    const searchPattern = `%${query.q}%`;
    builder.where((subquery) => {
      subquery.whereILike('cl.claim_no', searchPattern);
      subquery.orWhereILike('c.name', searchPattern);
      subquery.orWhereILike('c.phone', searchPattern);
      subquery.orWhereILike('p.sku', searchPattern);
      subquery.orWhereILike('p.name', searchPattern);
    });
  }

  // Order newest claims first and limit to 50,001 rows
  builder.orderBy('cl.claim_date', 'desc');
  builder.limit(50001);

  const rows = await builder;
  return rows;
}

/**
 * Records an immutable audit trail entry for export events.
 *
 * Purpose:
 * Writes an event to `audit_logs` tracking who downloaded exports, the dataset,
 * applied filters, and total row count.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} auditEntry - Audit log data.
 * @param {number|string} auditEntry.userId - User ID downloading the export.
 * @param {string} auditEntry.action - Action identifier ('data.exported').
 * @param {string} auditEntry.entityType - Export target category ('export' or 'report').
 * @param {Object} auditEntry.details - Export filters and row count metadata.
 * @returns {Promise<void>}
 */
export async function writeExportAudit(db, { userId, action, entityType, details }) {
  const auditRow = {
    user_id: userId,
    action: action,
    entity_type: entityType,
    details: details,
  };

  const query = db('audit_logs');
  query.insert(auditRow);

  await query;
}
