import { requireDatabase } from '../../db/knex.js';

/**
 * Applies date range conditions (ISO timestamp bounds or calendar dates adjusted for store time zone)
 * to a Knex query builder.
 *
 * @param {import('knex').Knex.QueryBuilder} query - Query builder to modify.
 * @param {string} column - Database timestamp column to filter on.
 * @param {Object} filters - Filter object containing optional from, to, from_date, to_date.
 * @param {string} timeZone - Configured store time zone (e.g. 'Asia/Bangkok' or 'UTC').
 * @returns {void}
 */
export function applyDateRange(query, column, filters, timeZone) {
  if (filters.from) {
    query.where(column, '>=', filters.from);
  }

  if (filters.to) {
    query.where(column, '<=', filters.to);
  }

  if (filters.from_date) {
    query.whereRaw('(?? at time zone ?)::date >= ?::date', [column, timeZone, filters.from_date]);
  }

  if (filters.to_date) {
    query.whereRaw('(?? at time zone ?)::date <= ?::date', [column, timeZone, filters.to_date]);
  }
}

/**
 * Retrieves the configured store time zone from infrastructure environment variable (SRS-SET-01).
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [_trxOrDb] - Knex client or transaction.
 * @returns {Promise<string>} Store time zone string from infrastructure TZ (e.g. 'Asia/Bangkok' or 'UTC').
 */
export async function findStoreTimeZone(_trxOrDb) {
  return process.env.TZ || 'UTC';
}

/**
 * Calculates store timezone-aware date boundaries for dashboard queries.
 *
 * Implements FYP Coding Standards:
 * - Avoids dense one-line chained methods.
 * - Explicitly declares current time, applies timezone offset, and defines
 *   start and end boundaries as named variables with step-by-step comments.
 *
 * @param {string} timeZone - Configured store time zone (e.g. 'Asia/Bangkok' or 'UTC').
 * @returns {{
 *   todayDateString: string,
 *   todayStartTimestamp: string,
 *   todayEndTimestamp: string,
 *   sevenDaysAgoDateString: string,
 *   sevenDaysStartTimestamp: string,
 *   timeZone: string
 * }}
 */
export function calculateStoreDateBoundaries(timeZone) {
  // Step 1: Declare current system time
  const currentTime = new Date();

  // Step 2: Apply the timezone offset using Intl.DateTimeFormat to determine the calendar date in store time
  const storeDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayDateString = storeDateFormatter.format(currentTime);

  // Step 3: Define explicit start boundary (00:00:00.000) and end boundary (23:59:59.999) for "Today"
  const todayStartTimestamp = `${todayDateString} 00:00:00.000`;
  const todayEndTimestamp = `${todayDateString} 23:59:59.999`;

  // Step 4: Deconstruct year, month, and day to calculate the start of the 7-day trailing window
  const dateSegments = todayDateString.split('-');
  const currentYear = Number(dateSegments[0]);
  const currentMonthIndex = Number(dateSegments[1]) - 1;
  const currentDay = Number(dateSegments[2]);

  // Step 5: Establish anchor date at UTC midnight corresponding to the store calendar day
  const anchorDate = new Date(Date.UTC(currentYear, currentMonthIndex, currentDay));

  // Step 6: Offset backwards by 6 days to include 7 full calendar days [today - 6, today]
  const trailingDaysOffset = 6;
  anchorDate.setUTCDate(anchorDate.getUTCDate() - trailingDaysOffset);

  // Step 7: Define explicit start boundary timestamp for the 7-day window
  const sevenDaysAgoDateString = anchorDate.toISOString().slice(0, 10);
  const sevenDaysStartTimestamp = `${sevenDaysAgoDateString} 00:00:00.000`;

  return {
    todayDateString,
    todayStartTimestamp,
    todayEndTimestamp,
    sevenDaysAgoDateString,
    sevenDaysStartTimestamp,
    timeZone,
  };
}

/**
 * Computes the current calendar date string (YYYY-MM-DD) in the store's configured time zone.
 *
 * @param {string} timeZone - Configured store time zone.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<string>} Today's date string in YYYY-MM-DD format.
 */
export async function fetchStoreDateToday(timeZone, trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const todayResult = await db.raw(
    'SELECT (now() AT TIME ZONE ?)::date::text AS day',
    [timeZone]
  );

  return todayResult.rows[0].day;
}

/**
 * Calculates today's completed sales totals (monetary sum and receipt count) in the store's time zone.
 *
 * @param {string} timeZone - Configured store time zone.
 * @param {string|Object} boundariesOrDate - Precomputed boundary object or YYYY-MM-DD date string.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<{ total: string|null, count: number|string }>} Aggregated sales totals for today.
 */
export async function fetchTodaySalesTotals(timeZone, boundariesOrDate, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const startTimestamp = typeof boundariesOrDate === 'object' && boundariesOrDate.todayStartTimestamp
    ? boundariesOrDate.todayStartTimestamp
    : `${boundariesOrDate} 00:00:00.000`;

  const endTimestamp = typeof boundariesOrDate === 'object' && boundariesOrDate.todayEndTimestamp
    ? boundariesOrDate.todayEndTimestamp
    : `${boundariesOrDate} 23:59:59.999`;

  // Query completed sales within the explicit start and end boundaries for today
  const totals = await db('sales')
    .where({ status: 'completed' })
    .whereRaw(
      '(sold_at AT TIME ZONE ?) >= ?::timestamp AND (sold_at AT TIME ZONE ?) <= ?::timestamp',
      [timeZone, startTimestamp, timeZone, endTimestamp]
    )
    .sum({ total: 'total' })
    .count({ count: '*' })
    .first();

  return totals;
}

/**
 * Retrieves daily aggregated sales volume and revenue for the trailing 7 days
 * evaluated relative to the store's configured time zone.
 *
 * @param {string} timeZone - Configured store time zone.
 * @param {string|Object} boundariesOrDate - Precomputed boundary object or YYYY-MM-DD date string.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<{ day: string, total: string, count: number }>>} Daily sales aggregated rows.
 */
export async function fetch7DaySalesTrend(timeZone, boundariesOrDate, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  let startTimestamp;
  let endTimestamp;

  if (typeof boundariesOrDate === 'object' && boundariesOrDate.sevenDaysStartTimestamp) {
    startTimestamp = boundariesOrDate.sevenDaysStartTimestamp;
    endTimestamp = boundariesOrDate.todayEndTimestamp;
  } else {
    startTimestamp = `${boundariesOrDate} 00:00:00.000`;
    endTimestamp = `${boundariesOrDate} 23:59:59.999`;
  }

  // Aggregate completed sales grouped by calendar day in store time zone
  // within the 7-day trailing window
  const dailyRows = await db.raw(
    `SELECT (s.sold_at AT TIME ZONE ?)::date::text AS day,
            COALESCE(SUM(s.total), 0)::text AS total,
            COUNT(*)::int AS count
     FROM sales s
     WHERE s.status = 'completed'
       AND (s.sold_at AT TIME ZONE ?) >= ?::timestamp
       AND (s.sold_at AT TIME ZONE ?) <= ?::timestamp
     GROUP BY 1
     ORDER BY 1`,
    [timeZone, timeZone, startTimestamp, timeZone, endTimestamp]
  );

  return dailyRows.rows;
}

/**
 * Retrieves top-selling products by quantity over the trailing 7 days
 * evaluated relative to the store's configured time zone.
 *
 * @param {string} timeZone - Configured store time zone.
 * @param {string|Object} boundariesOrDate - Precomputed boundary object or YYYY-MM-DD date string.
 * @param {number} [limit=5] - Number of top products to retrieve.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<Object>>} Top products with sold quantity and revenue.
 */
export async function fetchTopSellingProducts(timeZone, boundariesOrDate, limit = 5, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  let startTimestamp;
  let endTimestamp;

  if (typeof boundariesOrDate === 'object' && boundariesOrDate.sevenDaysStartTimestamp) {
    startTimestamp = boundariesOrDate.sevenDaysStartTimestamp;
    endTimestamp = boundariesOrDate.todayEndTimestamp;
  } else {
    startTimestamp = `${boundariesOrDate} 00:00:00.000`;
    endTimestamp = `${boundariesOrDate} 23:59:59.999`;
  }

  const topProducts = await db('sale_items as si')
    .join('sales as s', 's.id', 'si.sale_id')
    .where('s.status', 'completed')
    .whereRaw(
      '(s.sold_at AT TIME ZONE ?) >= ?::timestamp AND (s.sold_at AT TIME ZONE ?) <= ?::timestamp',
      [timeZone, startTimestamp, timeZone, endTimestamp]
    )
    .groupBy('si.product_id', 'si.name_snapshot')
    .select(
      'si.product_id as productId',
      'si.name_snapshot as name'
    )
    .sum({ quantity: 'si.quantity' })
    .sum({ revenue: 'si.line_total' })
    .orderBy('quantity', 'desc')
    .limit(limit);

  return topProducts;
}

/**
 * Aggregates current inventory statistics across all active products.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<{ products: number|string, units: number|string, lowStock: number|string }>} Inventory counts.
 */
export async function fetchInventoryCounts(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const stock = await db('products')
    .where({ status: 'active' })
    .count({ products: '*' })
    .sum({ units: 'stock_qty' })
    .sum({
      lowStock: db.raw('case when stock_qty <= reorder_level then 1 else 0 end'),
    })
    .first();

  return stock;
}

/**
 * Counts total active categories in the catalog.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<{ count: number|string }>} Active categories count.
 */
export async function fetchActiveCategoriesCount(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const categories = await db('categories')
    .where({ status: 'active' })
    .count({ count: '*' })
    .first();

  return categories;
}

/**
 * Computes the total inventory valuation based on current active product stock quantities and cost prices.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<{ value: string|null }>} Inventory valuation sum.
 */
export async function fetchTotalStockValue(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const value = await db('products')
    .where({ status: 'active' })
    .sum({ value: db.raw('stock_qty * cost_price') })
    .first();

  return value;
}

/**
 * Retrieves analytical sales groupings according to the specified aggregation dimension.
 *
 * @param {Object} filters - Sales report filter criteria.
 * @param {string} timeZone - Configured store time zone.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<{ selectedKey: string, groups: Array<Object> }>} Grouping key and aggregated data rows.
 */
export async function fetchSalesReportGroups(filters, timeZone, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const groupExpressions = {
    day: {
      expression: db.raw('(s.sold_at at time zone ?)::date::text', [timeZone]),
      key: 'day',
    },
    product: {
      expression: 'si.name_snapshot',
      key: 'product',
    },
    category: {
      expression: 'c.name',
      key: 'category',
    },
    user: {
      expression: 'u.full_name',
      key: 'user',
    },
    payment: {
      expression: 's.payment_method',
      key: 'paymentMethod',
    },
  };

  const selected = groupExpressions[filters.group];

  const query = db('sales as s')
    .join('sale_items as si', 'si.sale_id', 's.id')
    .join('products as p', 'p.id', 'si.product_id')
    .join('categories as c', 'c.id', 'p.category_id')
    .join('users as u', 'u.id', 's.user_id')
    .where('s.status', 'completed');

  applyDateRange(query, 's.sold_at', filters, timeZone);

  if (filters.user_id) {
    query.where('s.user_id', filters.user_id);
  }

  if (filters.category_id) {
    query.where('p.category_id', filters.category_id);
  }

  if (filters.product_id) {
    query.where('si.product_id', filters.product_id);
  }

  if (filters.payment_method) {
    query.where('s.payment_method', filters.payment_method);
  }

  const groups = await query
    .select({ [selected.key]: selected.expression })
    .select(db.raw('sum(si.quantity)::int as quantity'))
    .sum({ subtotal: db.raw('si.line_total') })
    .sum({
      discount: db.raw('case when s.subtotal > 0 then s.discount_amount * si.line_total / s.subtotal else 0 end'),
    })
    .sum({
      total: db.raw('case when s.subtotal > 0 then s.total * si.line_total / s.subtotal else 0 end'),
    })
    .groupByRaw('1')
    .orderByRaw('1 asc')
    .limit(5000);

  return {
    selectedKey: selected.key,
    groups,
  };
}

/**
 * Retrieves voided sales transactions matching date and user filters.
 *
 * @param {Object} filters - Sales report filter criteria.
 * @param {string} timeZone - Configured store time zone.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<Object>>} List of voided sale records.
 */
export async function fetchVoidedSales(filters, timeZone, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const voidedQuery = db('sales as s')
    .leftJoin('customers as c', 'c.id', 's.customer_id')
    .join('users as u', 'u.id', 's.user_id')
    .where('s.status', 'voided');

  applyDateRange(voidedQuery, 's.sold_at', filters, timeZone);

  if (filters.user_id) {
    voidedQuery.where('s.user_id', filters.user_id);
  }

  if (filters.payment_method) {
    voidedQuery.where('s.payment_method', filters.payment_method);
  }

  const voided = await voidedQuery
    .select(
      's.sale_no',
      's.sold_at',
      's.total',
      's.void_reason',
      'c.name as customer',
      'u.full_name as staff'
    )
    .orderBy('s.sold_at', 'desc')
    .limit(1000);

  return voided;
}

/**
 * Retrieves current active product stock levels for the inventory report.
 *
 * @param {Object} filters - Scope filters (category_id, product_id).
 * @param {boolean} includeCostPrice - Whether to include cost_price (Admin only).
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<Object>>} Active product stock records.
 */
export async function fetchInventoryReportCurrent(filters, includeCostPrice, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const query = db('products as p')
    .leftJoin('categories as c', 'c.id', 'p.category_id')
    .where('p.status', 'active');

  if (filters.category_id) {
    query.where('p.category_id', filters.category_id);
  }

  if (filters.product_id) {
    query.where('p.id', filters.product_id);
  }

  const selectColumns = [
    'p.id',
    'p.sku',
    'p.name',
    'c.name as category',
    'p.stock_qty',
    'p.reorder_level',
  ];

  if (includeCostPrice) {
    selectColumns.push('p.cost_price');
  }

  const currentProducts = await query
    .select(selectColumns)
    .orderBy('p.name')
    .limit(5000);

  return currentProducts;
}

/**
 * Retrieves historical inventory transactions for the inventory report.
 *
 * @param {Object} filters - Scope and date range filters.
 * @param {string} timeZone - Configured store time zone.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<Object>>} Inventory ledger movement history records.
 */
export async function fetchInventoryReportMovements(filters, timeZone, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const query = db('inventory_transactions as t')
    .join('products as p', 'p.id', 't.product_id')
    .join('users as u', 'u.id', 't.user_id');

  applyDateRange(query, 't.created_at', filters, timeZone);

  if (filters.category_id) {
    query.where('p.category_id', filters.category_id);
  }

  if (filters.product_id) {
    query.where('p.id', filters.product_id);
  }

  const movements = await query
    .select(
      't.id',
      'p.sku',
      'p.name',
      't.type',
      't.quantity_change',
      't.balance_after',
      't.reason',
      'u.full_name as user',
      't.created_at'
    )
    .orderBy('t.created_at', 'desc')
    .limit(1000);

  return movements;
}

/**
 * Counts warranty claims aggregated by claim lifecycle status.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<{ status: string, count: number|string }>>} Status counts.
 */
export async function fetchWarrantyStatusCounts(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const statuses = await db('warranty_claims')
    .select('status')
    .count({ count: '*' })
    .groupBy('status')
    .orderBy('status');

  return statuses;
}

/**
 * Retrieves claims sent to suppliers that have exceeded their expected return date.
 *
 * @param {string} todayDate - Today's date string (YYYY-MM-DD).
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<Object>>} Overdue claim records.
 */
export async function fetchOverdueClaims(todayDate, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const overdue = await db('warranty_claims as cl')
    .join('warranties as w', 'w.id', 'cl.warranty_id')
    .join('products as p', 'p.id', 'w.product_id')
    .join('customers as c', 'c.id', 'cl.customer_id')
    .leftJoin('suppliers as sp', 'sp.id', 'cl.supplier_id')
    .where('cl.status', 'With Supplier')
    .whereNull('cl.actual_return_date')
    .where('cl.expected_return_date', '<', todayDate)
    .select(
      'cl.id',
      'cl.claim_no',
      'cl.expected_return_date',
      'p.sku',
      'p.name as product',
      'c.name as customer',
      'c.phone as phone',
      'sp.name as supplier'
    )
    .orderBy('cl.expected_return_date')
    .limit(1000);

  return overdue;
}

/**
 * Aggregates claims assigned to external suppliers.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<{ supplier_id: number|string, supplier: string, count: number|string }>>} Claims per supplier.
 */
export async function fetchClaimsBySupplier(trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const bySupplier = await db('warranty_claims as cl')
    .leftJoin('suppliers as sp', 'sp.id', 'cl.supplier_id')
    .whereNotNull('cl.supplier_id')
    .select('sp.id as supplier_id', 'sp.name as supplier')
    .count({ count: '*' })
    .groupBy('sp.id', 'sp.name')
    .orderBy('sp.name');

  return bySupplier;
}

