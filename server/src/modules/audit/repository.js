/**
 * Audit Repository
 *
 * Handles database operations for the `audit_logs` table.
 * Adheres strictly to the MicroLedger architecture rule: "Repositories do SQL only."
 */

/**
 * Builds the base Knex query for audit logs with user details and applied search filters.
 *
 * Purpose:
 * Constructs a query builder instance joining `audit_logs` with the `users` table
 * to resolve operator names, and applies optional query filters (user ID, action keyword,
 * entity type, and timestamp range).
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} filters - Search and filtering parameters.
 * @param {string} [filters.user_id] - Filter by specific operator user ID.
 * @param {string} [filters.action] - Substring to match against the action field (case-insensitive).
 * @param {string} [filters.entity_type] - Exact match for the entity type.
 * @param {string} [filters.from] - Minimum creation timestamp (inclusive).
 * @param {string} [filters.to] - Maximum creation timestamp (inclusive).
 * @returns {import('knex').Knex.QueryBuilder} Knex query builder with joins and filters applied.
 */
export function buildAuditLogsFilterQuery(db, filters) {
  // Start query from the audit_logs table aliased as 'a'
  const query = db('audit_logs as a');

  // Left join users table aliased as 'u' to retrieve the actor's full name
  query.leftJoin('users as u', 'u.id', 'a.user_id');

  // Apply user_id filter if provided
  if (filters.user_id) {
    query.where('a.user_id', filters.user_id);
  }

  // Apply action substring search if provided (case-insensitive ILIKE)
  if (filters.action) {
    const actionPattern = `%${filters.action}%`;
    query.whereILike('a.action', actionPattern);
  }

  // Apply entity_type filter if provided
  if (filters.entity_type) {
    query.where('a.entity_type', filters.entity_type);
  }

  // Apply start timestamp filter if provided (created_at >= from)
  if (filters.from) {
    query.where('a.created_at', '>=', filters.from);
  }

  // Apply end timestamp filter if provided (created_at <= to)
  if (filters.to) {
    query.where('a.created_at', '<=', filters.to);
  }

  return query;
}

/**
 * Fetches a paginated slice of audit logs based on search filters.
 *
 * Purpose:
 * Executes a SELECT query to retrieve audit log rows with full details,
 * ordered from newest to oldest, applying page size limits and offsets.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} filters - Search and pagination parameters.
 * @param {number} filters.page - Current page number (1-indexed).
 * @param {number} filters.page_size - Maximum number of records to return.
 * @returns {Promise<Array<Object>>} List of audit log records with user details.
 */
export async function findAuditLogs(db, filters) {
  // 1. Build the base query containing joins and where conditions
  const query = buildAuditLogsFilterQuery(db, filters);

  // 2. Select the required columns from audit_logs and joined users table
  query.select(
    'a.id',
    'a.user_id',
    'u.full_name as user_name',
    'a.action',
    'a.entity_type',
    'a.entity_id',
    'a.details',
    'a.created_at'
  );

  // 3. Order logs by creation time descending (most recent first)
  query.orderBy('a.created_at', 'desc');

  // 4. Calculate pagination offset
  const pageNumber = filters.page;
  const pageSize = filters.page_size;
  const offsetRows = (pageNumber - 1) * pageSize;

  // 5. Apply pagination limits to the query
  query.limit(pageSize);
  query.offset(offsetRows);

  // 6. Execute the query against the database
  const rows = await query;
  return rows;
}

/**
 * Counts the total number of audit log records that match the given filters.
 *
 * Purpose:
 * Executes an aggregate COUNT query on the filtered audit logs to provide
 * the total number of records for pagination calculations.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} filters - Search filter parameters.
 * @returns {Promise<number>} Total count of matching audit log rows.
 */
export async function countAuditLogs(db, filters) {
  // 1. Build the base query containing joins and where conditions
  const query = buildAuditLogsFilterQuery(db, filters);

  // 2. Add count aggregate on primary key
  query.count('a.id as count');

  // 3. Retrieve the first row from the count query
  const countRow = await query.first();

  // 4. Parse the raw database count into a numeric value
  const rawCount = countRow ? countRow.count : 0;
  const totalCount = Number(rawCount);

  return totalCount;
}

/**
 * Inserts a new audit log record into the database.
 *
 * Purpose:
 * Writes an append-only audit trail row documenting an action performed
 * by a user or the system on a given entity.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {Object} logEntry - Audit entry payload.
 * @param {number|string} [logEntry.userId] - ID of the user performing the action.
 * @param {string} logEntry.action - Identifying string for the action performed.
 * @param {string} [logEntry.entityType] - Type of entity affected by the action.
 * @param {number|string} [logEntry.entityId] - Primary key ID of the affected entity.
 * @param {Object} [logEntry.details] - JSON-serializable object containing event metadata.
 * @returns {Promise<Object>} The newly created audit log database record.
 */
export async function insertAuditLogRow(db, logEntry) {
  // 1. Construct insert payload conforming to database column definitions
  const insertPayload = {
    user_id: logEntry.userId ?? null,
    action: logEntry.action,
    entity_type: logEntry.entityType ?? null,
    entity_id: logEntry.entityId ?? null,
    details: logEntry.details ?? null,
  };

  // 2. Execute insert statement and return all inserted column values
  const insertedRows = await db('audit_logs')
    .insert(insertPayload)
    .returning([
      'id',
      'user_id',
      'action',
      'entity_type',
      'entity_id',
      'details',
      'created_at',
    ]);

  // 3. Return the single created record
  const createdRecord = insertedRows[0];
  return createdRecord;
}
