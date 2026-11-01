import { requireDatabase } from '../../db/knex.js';

/**
 * Warranties Database Repository
 *
 * Provides dedicated data access methods for querying, creating, and modifying
 * warranty records and corresponding audit logs.
 * Strictly adheres to the project architecture rule: "Repositories do SQL only."
 */

/**
 * Executes a sequence of database operations within an isolated transaction.
 *
 * @param {Function} callback - Async function receiving the active Knex transaction client.
 * @returns {Promise<any>} The result returned by the transaction callback.
 */
export async function runInTransaction(callback) {
  const db = requireDatabase();
  return await db.transaction(callback);
}

/**
 * Retrieves the configured store time zone from application settings.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or active transaction.
 * @returns {Promise<string>} Configured IANA time zone identifier, defaulting to 'UTC'.
 */
export async function findStoreTimeZone(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const setting = await db('settings').where({ key: 'time_zone' }).first('value');
  const storeZone = setting?.value || 'UTC';
  return storeZone;
}

/**
 * Calculates current calendar date in the store's configured time zone.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Knex client or active transaction.
 * @param {string} zone - Store time zone identifier.
 * @returns {Promise<string>} Today's date formatted as 'YYYY-MM-DD'.
 */
export async function getStoreTodayDate(trxOrDb, zone) {
  const db = trxOrDb || requireDatabase();
  const rawQuery = 'SELECT (now() AT TIME ZONE ?)::date::text AS day';
  const result = await db.raw(rawQuery, [zone]);
  const todayDateString = result.rows[0].day;
  return todayDateString;
}

/**
 * Builds the base Knex query joining warranty records with associated products,
 * customers, and sales, applying text search and validity status filters.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or active transaction.
 * @param {Object} filters - Search and filtering criteria.
 * @param {string} today - Today's date string in store time zone.
 * @returns {import('knex').Knex.QueryBuilder} Configured Knex query builder.
 */
export function buildWarrantiesQuery(trxOrDb, filters, today) {
  const db = trxOrDb || requireDatabase();
  const query = db('warranties as w')
    .join('products as p', 'p.id', 'w.product_id')
    .leftJoin('customers as c', 'c.id', 'w.customer_id')
    .leftJoin('sale_items as si', 'si.id', 'w.sale_item_id')
    .leftJoin('sales as s', 's.id', 'si.sale_id');

  // Text search across SKU, product name, customer phone/name, serial number, and sale invoice number
  if (filters.q) {
    const escapedTerm = filters.q.replace(/[\\%_]/g, '\\$&');
    const term = `%${escapedTerm}%`;

    query.where((builder) => {
      builder
        .whereILike('p.sku', term)
        .orWhereILike('p.name', term)
        .orWhereILike('c.phone', term)
        .orWhereILike('c.name', term)
        .orWhereILike('w.serial_no', term)
        .orWhereILike('s.sale_no', term);
    });
  }

  // Validity filter based on store current date vs expiry date
  if (filters.validity === 'active') {
    query.where('w.expiry_date', '>=', today);
  } else if (filters.validity === 'expired') {
    query.where('w.expiry_date', '<', today);
  }

  return query;
}

/**
 * Retrieves a paginated list of warranty records matching filters.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or active transaction.
 * @param {Object} filters - Query pagination and filtering parameters.
 * @param {string} today - Today's date string in store time zone.
 * @returns {Promise<Array<Object>>} List of warranty database rows.
 */
export async function findWarranties(trxOrDb, filters, today) {
  const query = buildWarrantiesQuery(trxOrDb, filters, today);

  query.select(
    'w.id',
    'w.product_id',
    'w.customer_id',
    'w.serial_no',
    'w.start_date',
    'w.expiry_date',
    'w.source',
    'p.sku',
    'p.name as product_name',
    'c.name as customer_name',
    'c.phone as customer_phone',
    's.sale_no',
    's.status as sale_status'
  );

  query.orderBy('w.start_date', 'desc');
  query.orderBy('w.id', 'desc');

  const offsetRows = (filters.page - 1) * filters.page_size;
  query.limit(filters.page_size);
  query.offset(offsetRows);

  const rows = await query;
  return rows;
}

/**
 * Counts the total number of distinct warranty records matching filters.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or active transaction.
 * @param {Object} filters - Query filtering parameters.
 * @param {string} today - Today's date string in store time zone.
 * @returns {Promise<number>} Total count of matching warranty records.
 */
export async function countWarranties(trxOrDb, filters, today) {
  const query = buildWarrantiesQuery(trxOrDb, filters, today);
  const result = await query.countDistinct('w.id as count').first();
  const totalCount = Number(result?.count || 0);
  return totalCount;
}

/**
 * Finds an active product record to verify warranty eligibility.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Knex client or active transaction.
 * @param {number|string} productId - Product ID to verify.
 * @returns {Promise<Object|undefined>} Product record or undefined if not found or inactive.
 */
export async function findActiveProductForWarranty(trxOrDb, productId) {
  const db = trxOrDb || requireDatabase();
  const product = await db('products')
    .where({ id: productId, status: 'active' })
    .first('id', 'warranty_months');
  return product;
}

/**
 * Finds a customer record by ID to verify existence.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Knex client or active transaction.
 * @param {number|string} customerId - Customer ID to lookup.
 * @returns {Promise<Object|undefined>} Customer record or undefined if not found.
 */
export async function findCustomerById(trxOrDb, customerId) {
  const db = trxOrDb || requireDatabase();
  const customer = await db('customers')
    .where({ id: customerId })
    .first('id');
  return customer;
}

/**
 * Inserts a new manual warranty record with calculated expiry date.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {Object} data - Warranty creation data.
 * @param {string|number} data.productId - Target product ID.
 * @param {string|number} data.customerId - Target customer ID.
 * @param {string} data.startDate - Starting date string ('YYYY-MM-DD').
 * @param {number} data.months - Warranty duration in months.
 * @returns {Promise<Object>} Created warranty record row.
 */
export async function insertManualWarranty(trx, { productId, customerId, startDate, months }) {
  const rawInterval = trx.raw("?::date + (?::text || ' months')::interval", [startDate, months]);

  const insertPayload = {
    product_id: productId,
    customer_id: customerId,
    start_date: startDate,
    expiry_date: rawInterval,
    source: 'manual',
  };

  const rows = await trx('warranties').insert(insertPayload).returning('*');
  const createdRecord = rows[0];
  return createdRecord;
}

/**
 * Finds a warranty record by ID and locks the row for updating.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {number|string} id - Warranty primary key ID.
 * @returns {Promise<Object|undefined>} Locked warranty record or undefined if not found.
 */
export async function findWarrantyByIdForUpdate(trx, id) {
  const record = await trx('warranties')
    .where({ id })
    .forUpdate()
    .first();
  return record;
}

/**
 * Updates the customer assigned to a specific warranty record.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {number|string} id - Warranty primary key ID.
 * @param {number|string} customerId - Customer ID to attach.
 * @returns {Promise<number>} Number of updated rows.
 */
export async function updateWarrantyCustomer(trx, id, customerId) {
  const updatedCount = await trx('warranties')
    .where({ id })
    .update({ customer_id: customerId });
  return updatedCount;
}

/**
 * Writes an audit log entry for warranty lifecycle events.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {number|string} actorId - User ID initiating the operation.
 * @param {string} action - Audit action identifier (e.g. 'warranty.manual_created').
 * @param {number|string} warrantyId - Target warranty ID.
 * @param {Object} details - Additional audit metadata.
 * @returns {Promise<void>}
 */
export async function writeWarrantyAudit(trx, actorId, action, warrantyId, details) {
  const auditEntry = {
    user_id: actorId,
    action: action,
    entity_type: 'warranty',
    entity_id: warrantyId,
    details: details,
  };

  await trx('audit_logs').insert(auditEntry);
}
