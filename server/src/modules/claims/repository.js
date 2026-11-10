/**
 * Warranty Claims Repository
 *
 * Handles database operations for warranty claims, status transitions, and audit logs.
 * Strictly adheres to the project architecture rule: "Repositories do SQL only."
 */

/**
 * Retrieves the configured store time zone from infrastructure environment variable (SRS-SET-01).
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} [_trx] - Knex database or transaction instance.
 * @returns {Promise<string>} The configured time zone string from infrastructure TZ or 'UTC'.
 */
export async function findStoreTimeZone(_trx) {
  return process.env.TZ || 'UTC';
}

/**
 * Calculates current calendar date in the store's configured time zone.
 *
 * Purpose:
 * Executes a PostgreSQL date query to determine today's date in the store's local time zone.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {string} zone - The IANA time zone identifier (e.g., 'Asia/Ho_Chi_Minh', 'UTC').
 * @returns {Promise<string>} Current local date in YYYY-MM-DD string format.
 */
export async function getStoreTodayDate(trx, zone) {
  const rawQuery = 'SELECT (now() AT TIME ZONE ?)::date::text AS day';
  const result = await trx.raw(rawQuery, [zone]);
  const todayDateString = result.rows[0].day;
  return todayDateString;
}

/**
 * Builds the base Knex query for warranty claims with relational joins and filters.
 *
 * Purpose:
 * Prepares the query joining claims with warranties, products, customers, suppliers,
 * and users, and attaches all applicable search filters.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} filters - Search and filtering parameters.
 * @param {string} today - Today's date string in store time zone.
 * @returns {import('knex').Knex.QueryBuilder} Knex query builder with joins and filters.
 */
export function buildClaimsFilterQuery(db, filters, today) {
  const query = db('warranty_claims as cl');

  // Relational joins to enrich claim data
  query.join('warranties as w', 'w.id', 'cl.warranty_id');
  query.join('products as p', 'p.id', 'w.product_id');
  query.join('customers as c', 'c.id', 'cl.customer_id');
  query.leftJoin('suppliers as sp', 'sp.id', 'cl.supplier_id');
  query.leftJoin('users as u', 'u.id', 'cl.created_by');

  // Select standard claim columns with joined names
  query.select(
    'cl.*',
    'w.serial_no',
    'w.expiry_date',
    'p.sku',
    'p.name as product_name',
    'c.name as customer_name',
    'c.phone as customer_phone',
    'sp.name as supplier_name',
    'u.full_name as created_by_name'
  );

  // Filter by status if supplied
  if (filters.status) {
    query.where('cl.status', filters.status);
  }

  // Filter by supplier ID if supplied
  if (filters.supplier_id) {
    query.where('cl.supplier_id', filters.supplier_id);
  }

  // Filter by date range
  if (filters.from) {
    query.where('cl.claim_date', '>=', filters.from);
  }
  if (filters.to) {
    query.where('cl.claim_date', '<=', filters.to);
  }

  // Filter by customer phone substring
  if (filters.phone) {
    const phonePattern = `%${filters.phone}%`;
    query.whereILike('c.phone', phonePattern);
  }

  // Filter for overdue claims: item is with supplier, not yet returned, and past expected date
  if (filters.overdue) {
    query.where('cl.status', 'With Supplier');
    query.whereNull('cl.actual_return_date');
    query.where('cl.expected_return_date', '<', today);
  }

  return query;
}

/**
 * Retrieves a paginated list of warranty claims matching search filters.
 *
 * Purpose:
 * Executes the filtered claims query with descending sorting and pagination limits.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} filters - Search and pagination options.
 * @param {string} today - Today's date string.
 * @returns {Promise<Array<Object>>} List of claim records.
 */
export async function findClaims(db, filters, today) {
  const query = buildClaimsFilterQuery(db, filters, today);

  // Order claims newest to oldest
  query.orderBy('cl.claim_date', 'desc');
  query.orderBy('cl.id', 'desc');

  // Calculate pagination offset
  const pageNumber = filters.page;
  const pageSize = filters.page_size;
  const offset = (pageNumber - 1) * pageSize;

  query.limit(pageSize);
  query.offset(offset);

  const rows = await query;
  return rows;
}

/**
 * Counts the total number of distinct claims matching the filter criteria.
 *
 * Purpose:
 * Performs a COUNT DISTINCT aggregation on matching claims for pagination metadata.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} filters - Search filters.
 * @param {string} today - Today's date string.
 * @returns {Promise<number>} Total count of matching claims.
 */
export async function countClaims(db, filters, today) {
  const query = buildClaimsFilterQuery(db, filters, today);

  query.clearSelect();
  query.clearOrder();
  query.countDistinct('cl.id as count');

  const countRow = await query.first();
  const rawCount = countRow ? countRow.count : 0;
  const totalCount = Number(rawCount);

  return totalCount;
}

/**
 * Retrieves a single claim record by ID including product, customer, warranty, and supplier details.
 *
 * Purpose:
 * Fetches full enriched claim record for detailed viewing.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {number|string} id - Claim primary key ID.
 * @returns {Promise<Object|undefined>} The claim record, or undefined if not found.
 */
export async function findClaimById(db, id) {
  const query = db('warranty_claims as cl');
  query.join('warranties as w', 'w.id', 'cl.warranty_id');
  query.join('products as p', 'p.id', 'w.product_id');
  query.join('customers as c', 'c.id', 'cl.customer_id');
  query.leftJoin('suppliers as sp', 'sp.id', 'cl.supplier_id');
  query.leftJoin('users as u', 'u.id', 'cl.created_by');
  query.where('cl.id', id);
  query.select(
    'cl.*',
    'w.serial_no',
    'w.expiry_date',
    'p.sku',
    'p.name as product_name',
    'c.name as customer_name',
    'c.phone as customer_phone',
    'sp.name as supplier_name',
    'u.full_name as created_by_name'
  );

  const row = await query.first();
  return row;
}

/**
 * Fetches a single warranty claim record with a pessimistic row lock (`FOR UPDATE`).
 *
 * Purpose:
 * Locks the claim record during status transitions to prevent concurrent modifications.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {number|string} id - Claim primary key ID.
 * @returns {Promise<Object|undefined>} The locked claim record.
 */
export async function findClaimByIdForUpdate(trx, id) {
  const query = trx('warranty_claims');
  query.where({ id });
  query.forUpdate();

  const row = await query.first();
  return row;
}

/**
 * Retrieves the full chronological status history of a claim.
 *
 * Purpose:
 * Fetches all status change logs for a claim along with the operator's full name.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {number|string} claimId - Target claim ID.
 * @returns {Promise<Array<Object>>} List of status history entries ordered chronologically.
 */
export async function findClaimStatusHistory(db, claimId) {
  const query = db('claim_status_history as h');
  query.join('users as u', 'u.id', 'h.user_id');
  query.where('h.claim_id', claimId);
  query.select('h.*', 'u.full_name as user_name');
  query.orderBy('h.created_at', 'asc');

  const rows = await query;
  return rows;
}

/**
 * Retrieves warranty details with product and sale information, locking the warranty row.
 *
 * Purpose:
 * Verifies that the warranty exists, is not from a voided sale, and locks the warranty row
 * during claim creation.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {number|string} warrantyId - Target warranty ID.
 * @returns {Promise<Object|undefined>} Warranty row with product name and sale status.
 */
export async function findWarrantyForClaim(trx, warrantyId) {
  const query = trx('warranties as w');
  query.join('products as p', 'p.id', 'w.product_id');
  query.leftJoin('sale_items as si', 'si.id', 'w.sale_item_id');
  query.leftJoin('sales as s', 's.id', 'si.sale_id');
  query.where('w.id', warrantyId);
  query.select('w.*', 'p.name as product_name', 's.status as sale_status');
  query.forUpdate('w');

  const row = await query.first();
  return row;
}

/**
 * Retrieves customer ID and phone number.
 *
 * Purpose:
 * Validates that the customer attached to the claim has a valid contact phone number.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} customerId - Target customer ID.
 * @returns {Promise<Object|undefined>} Customer record with id and phone.
 */
export async function findCustomerPhone(trx, customerId) {
  const query = trx('customers');
  query.where({ id: customerId });
  query.first('id', 'phone');

  const row = await query;
  return row;
}

/**
 * Checks whether a supplier exists and has an active status.
 *
 * Purpose:
 * Verifies that a supplier selected for external repair is active.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} supplierId - Target supplier ID.
 * @returns {Promise<Object|undefined>} Supplier record with id, or undefined if not active/found.
 */
export async function findActiveSupplier(trx, supplierId) {
  const query = trx('suppliers');
  query.where({
    id: supplierId,
    status: 'active',
  });
  query.first('id');

  const row = await query;
  return row;
}

/**
 * Inserts a new claim record into `warranty_claims`.
 *
 * Purpose:
 * Persists a new warranty claim and returns the complete created record.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {Object} claimData - Claim record data.
 * @returns {Promise<Object>} The inserted claim record.
 */
export async function insertClaim(trx, claimData) {
  const query = trx('warranty_claims');
  query.insert(claimData);
  query.returning('*');

  const result = await query;
  const createdRecord = result[0];
  return createdRecord;
}

/**
 * Inserts a status history entry into `claim_status_history`.
 *
 * Purpose:
 * Records an immutable lifecycle state change event for a claim.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {Object} historyData - History record attributes.
 * @returns {Promise<void>}
 */
export async function insertClaimStatusHistory(trx, historyData) {
  const query = trx('claim_status_history');
  query.insert(historyData);

  await query;
}

/**
 * Writes an audit log record for a claim event.
 *
 * Purpose:
 * Records an immutable audit log entry documenting claim creation or status updates.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {number|string} actorId - User ID performing the action.
 * @param {string} action - Action identifier (e.g. 'claim.created', 'claim.status_changed').
 * @param {number|string} claimId - Target claim ID.
 * @param {Object} details - Additional audit metadata.
 * @returns {Promise<void>}
 */
export async function writeClaimAudit(trx, actorId, action, claimId, details) {
  const auditRow = {
    user_id: actorId,
    action: action,
    entity_type: 'claim',
    entity_id: claimId,
    details: details,
  };

  const query = trx('audit_logs');
  query.insert(auditRow);

  await query;
}

/**
 * Updates an existing claim record in `warranty_claims`.
 *
 * Purpose:
 * Modifies status and transition data for a specific claim.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {number|string} id - Target claim ID.
 * @param {Object} updateData - Key-value map of fields to update.
 * @returns {Promise<void>}
 */
export async function updateClaim(trx, id, updateData) {
  const query = trx('warranty_claims');
  query.where({ id });
  query.update(updateData);

  await query;
}

