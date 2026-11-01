/**
 * Customers Repository
 *
 * Handles database operations for customer records, sales metric aggregations,
 * duplicate phone lookups, and customer audit trails.
 * Strictly adheres to the project architecture rule: "Repositories do SQL only."
 */

/**
 * Builds an aggregated subquery summarizing sales history for each customer.
 *
 * Purpose:
 * Aggregates visit counts and total lifetime expenditure for completed sales,
 * aliasing the subquery as 'ss' for joining with customer profile queries.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @returns {import('knex').Knex.QueryBuilder} Knex subquery aliased as 'ss'.
 */
function customerSalesSummary(trx) {
  const query = trx('sales');
  query.select('customer_id');
  query.count('id as visits');
  query.sum('total as lifetime_spend');
  query.whereNotNull('customer_id');
  query.where('status', 'completed');
  query.groupBy('customer_id');

  const subqueryAlias = query.as('ss');
  return subqueryAlias;
}

/**
 * Builds and executes a query to retrieve a paginated list of customers with sales metrics.
 *
 * Purpose:
 * Fetches customers joined with lifetime spend and visit counts, optionally filtering
 * by a search term across name or phone number, with ascending name and ID sorting.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {Object} filters - Search and pagination filters.
 * @param {string} [filters.q] - Search keyword.
 * @param {number} filters.page - 1-indexed page number.
 * @param {number} filters.page_size - Page size limit.
 * @returns {import('knex').Knex.QueryBuilder} Knex query builder resolving to customer list rows.
 */
export function customerListQuery(trx, filters) {
  // 1. Join customers table with sales metrics subquery
  const salesSummary = customerSalesSummary(trx);
  const query = trx('customers as cu');
  query.leftJoin(salesSummary, 'ss.customer_id', 'cu.id');

  // 2. Select profile fields and calculated lifetime metrics
  query.select(
    'cu.id',
    'cu.name',
    'cu.phone',
    'cu.created_at',
    'ss.visits',
    'ss.lifetime_spend'
  );

  // 3. Apply keyword search on name or phone if provided
  if (filters.q) {
    const escapedTerm = filters.q.replace(/[\\%_]/g, '\\$&');
    const searchPattern = `%${escapedTerm}%`;
    const sqlExpression = "(cu.name ILIKE ? ESCAPE E'\\\\' OR cu.phone ILIKE ? ESCAPE E'\\\\')";
    query.whereRaw(sqlExpression, [searchPattern, searchPattern]);
  }

  // 4. Order results alphabetically by name, then by ID
  query.orderBy('cu.name', 'asc');
  query.orderBy('cu.id', 'asc');

  // 5. Apply pagination limit and offset
  const pageNumber = filters.page;
  const pageSize = filters.page_size;
  const offset = (pageNumber - 1) * pageSize;

  query.limit(pageSize);
  query.offset(offset);

  return query;
}

/**
 * Builds and executes a count aggregation query for customers matching search criteria.
 *
 * Purpose:
 * Computes the total number of customer rows matching the given search filter
 * for pagination metadata.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {Object} filters - Search filters.
 * @param {string} [filters.q] - Search keyword.
 * @returns {import('knex').Knex.QueryBuilder} Knex query resolving to `{ count: string }`.
 */
export function customerCountQuery(trx, filters) {
  const query = trx('customers as cu');
  query.count('cu.id as count');

  // Apply keyword search condition
  if (filters.q) {
    const escapedTerm = filters.q.replace(/[\\%_]/g, '\\$&');
    const searchPattern = `%${escapedTerm}%`;
    const sqlExpression = "(cu.name ILIKE ? ESCAPE E'\\\\' OR cu.phone ILIKE ? ESCAPE E'\\\\')";
    query.whereRaw(sqlExpression, [searchPattern, searchPattern]);
  }

  query.first();
  return query;
}

/**
 * Searches for an existing customer sharing the same normalized phone digits.
 *
 * Purpose:
 * Strips all non-digit characters from the input phone and compares it with
 * digit-only customer phone numbers in the database, optionally ignoring a specific customer ID.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {string} phone - Raw phone string to check for duplicates.
 * @param {number|string|null} [exceptId=null] - Customer ID to exclude from duplicate search.
 * @returns {import('knex').Knex.QueryBuilder} Knex query resolving to matching duplicate row or undefined.
 */
export function findDuplicatePhone(trx, phone, exceptId = null) {
  // Strip all non-digit characters for canonical comparison
  const digitsOnly = phone.replace(/\D/g, '');

  const query = trx('customers');
  query.select('id', 'name', 'phone');
  query.whereRaw("regexp_replace(phone, '[^0-9]', '', 'g') = ?", [digitsOnly]);
  query.orderBy('id', 'asc');

  // Exclude current customer ID if updating an existing record
  if (exceptId) {
    query.whereNot({ id: exceptId });
  }

  query.first();
  return query;
}

/**
 * Inserts a new customer record into the `customers` table.
 *
 * Purpose:
 * Writes a customer row and returns the created record fields.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {Object} customer - Customer data to insert.
 * @param {string} customer.name - Customer full name.
 * @param {string|null} customer.phone - Customer phone number.
 * @returns {import('knex').Knex.QueryBuilder} Knex query returning created row fields.
 */
export function insertCustomer(trx, customer) {
  const query = trx('customers');
  query.insert(customer);
  query.returning(['id', 'name', 'phone', 'created_at']);

  return query;
}

/**
 * Finds a single customer record by primary key ID.
 *
 * Purpose:
 * Retrieves a customer profile row by its unique ID.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} id - Customer ID.
 * @returns {import('knex').Knex.QueryBuilder} Knex query resolving to customer row or undefined.
 */
export function findCustomer(trx, id) {
  const query = trx('customers');
  query.where({ id });
  query.first();

  return query;
}

/**
 * Updates an existing customer row in the `customers` table.
 *
 * Purpose:
 * Applies modifications to the specified customer row, updates the `updated_at` timestamp,
 * and returns the modified fields.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} id - Customer ID to update.
 * @param {Object} changes - Key-value map of updated fields.
 * @returns {import('knex').Knex.QueryBuilder} Knex query returning updated row fields.
 */
export function updateCustomerRow(trx, id, changes) {
  const updatePayload = {
    ...changes,
    updated_at: trx.fn.now(),
  };

  const query = trx('customers');
  query.where({ id });
  query.update(updatePayload);
  query.returning(['id', 'name', 'phone', 'created_at']);

  return query;
}

/**
 * Records an immutable audit log entry for customer actions.
 *
 * Purpose:
 * Documents customer creation and updates in the `audit_logs` table.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} actorId - ID of user performing the action.
 * @param {number|string} customerId - Target customer ID.
 * @param {string} action - Action identifier (e.g. 'customer.created', 'customer.updated').
 * @param {Object} details - Additional event metadata.
 * @returns {import('knex').Knex.QueryBuilder} Knex query inserting the audit log row.
 */
export function writeCustomerAudit(trx, actorId, customerId, action, details) {
  const auditRow = {
    user_id: actorId,
    action: action,
    entity_type: 'customer',
    entity_id: customerId,
    details: details,
  };

  const query = trx('audit_logs');
  query.insert(auditRow);

  return query;
}
