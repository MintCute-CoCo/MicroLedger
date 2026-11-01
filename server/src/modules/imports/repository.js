import { requireDatabase } from '../../db/knex.js';

/**
 * Executes a callback within a managed database transaction.
 *
 * @param {Function} callback - Async function that receives the active transaction client.
 * @returns {Promise<any>} The result of the callback execution.
 */
export async function runInTransaction(callback) {
  const db = requireDatabase();
  return await db.transaction(callback);
}

/**
 * Executes a callback within an isolated row savepoint (nested transaction).
 * If an error occurs inside the savepoint, only the current row's work is rolled back,
 * preventing failure of the overall outer transaction.
 *
 * @param {import('knex').Knex.Transaction} trx - The parent active database transaction.
 * @param {Function} callback - Async function executing row-level operations.
 * @returns {Promise<any>} The result of the savepoint callback execution.
 */
export async function runInRowSavepoint(trx, callback) {
  return await trx.transaction(callback);
}

/**
 * Retrieves all product categories from the database.
 * Used during import validation to verify category existence and status.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Optional Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, name: string, status: string }>>} List of category records.
 */
export async function findAllCategories(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const categories = await db('categories')
    .select('id', 'name', 'status');

  return categories;
}

/**
 * Retrieves products matching a specified list of SKU strings (case-insensitive and trimmed).
 *
 * @param {string[]} skus - Array of SKU strings to search for.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Optional Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, sku: string, status: string }>>} Matching product records.
 */
export async function findProductsBySkus(skus, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  if (!skus || skus.length === 0) {
    return [];
  }

  const products = await db('products')
    .whereRaw('lower(trim(sku)) = any(?)', [skus])
    .select('id', 'sku', 'status');

  return products;
}

/**
 * Inserts a new import log record representing an uploaded preview batch.
 * Sets the default expiration time to 60 minutes from creation.
 *
 * @param {Object} logData - Information about the uploaded import batch.
 * @param {number} logData.userId - User ID of the administrator performing the import.
 * @param {string} logData.filename - Original name of the uploaded spreadsheet or CSV.
 * @param {string} logData.fileType - File extension ('xlsx' or 'csv').
 * @param {number} logData.rowsTotal - Total number of data rows in the file.
 * @param {number} logData.rowsValid - Count of valid (new or update) rows.
 * @param {number} logData.rowsError - Count of erroneous rows.
 * @param {string} logData.status - Initial status, typically 'previewed'.
 * @param {string} logData.payload - JSON string containing classified row details.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Optional Knex instance or transaction.
 * @returns {Promise<{ id: number|string, created_at: Date, expires_at: Date }>} Created log record identifiers.
 */
export async function createImportLog(logData, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const insertPayload = {
    user_id: logData.userId,
    filename: logData.filename.slice(0, 255),
    file_type: logData.fileType,
    rows_total: logData.rowsTotal,
    rows_valid: logData.rowsValid,
    rows_error: logData.rowsError,
    status: logData.status,
    payload: logData.payload,
    expires_at: db.raw("now() + interval '60 minutes'"),
  };

  const [createdLog] = await db('import_logs')
    .insert(insertPayload)
    .returning(['id', 'created_at', 'expires_at']);

  return createdLog;
}

/**
 * Finds an import log by primary key ID.
 *
 * @param {string|number} id - Import log primary identifier.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Optional Knex instance or transaction.
 * @returns {Promise<Object|undefined>} The found import log record, or undefined if not found.
 */
export async function findImportLogById(id, trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const log = await db('import_logs')
    .where({ id })
    .first(
      'id',
      'filename',
      'rows_total',
      'rows_valid',
      'rows_error',
      'status',
      'payload',
      'expires_at'
    );

  return log;
}

/**
 * Finds an import log record and locks it for update using PostgreSQL SELECT ... FOR UPDATE.
 * Prevents race conditions and double-commit attempts.
 *
 * @param {string|number} id - Import log primary identifier.
 * @param {import('knex').Knex.Transaction} trx - The active transaction client.
 * @returns {Promise<Object|undefined>} Locked import log record.
 */
export async function findImportLogByIdForUpdate(id, trx) {
  const log = await trx('import_logs')
    .where({ id })
    .forUpdate()
    .first();

  return log;
}

/**
 * Updates an import log record's status to 'expired' and clears its payload.
 *
 * @param {string|number} id - Import log primary identifier.
 * @param {import('knex').Knex.Transaction} trx - The active transaction client.
 * @returns {Promise<number>} Number of affected rows.
 */
export async function expireImportLog(id, trx) {
  const affected = await trx('import_logs')
    .where({ id })
    .update({
      status: 'expired',
      payload: null,
    });

  return affected;
}

/**
 * Marks an import log as successfully committed, clears the preview payload,
 * and records the completion timestamp.
 *
 * @param {string|number} id - Import log primary identifier.
 * @param {import('knex').Knex.Transaction} trx - The active transaction client.
 * @returns {Promise<number>} Number of affected rows.
 */
export async function markImportLogCommitted(id, trx) {
  const affected = await trx('import_logs')
    .where({ id })
    .update({
      status: 'committed',
      committed_at: trx.fn.now(),
      payload: null,
    });

  return affected;
}

/**
 * Inserts a newly imported product record into the products table.
 *
 * @param {Object} productData - Product attributes to insert.
 * @param {import('knex').Knex.Transaction} trx - The active transaction client.
 * @returns {Promise<{ id: number }>} The generated product identifier.
 */
export async function insertProduct(productData, trx) {
  const [createdProduct] = await trx('products')
    .insert(productData)
    .returning('id');

  return createdProduct;
}

/**
 * Updates an existing active product's fields with new imported values.
 * Note: opening stock is never modified here, ensuring stock invariant preservation.
 *
 * @param {number|string} productId - Primary key of the product to update.
 * @param {Object} productData - New field values to apply.
 * @param {import('knex').Knex.Transaction} trx - The active transaction client.
 * @returns {Promise<number>} Number of updated records.
 */
export async function updateProduct(productId, productData, trx) {
  const updatePayload = {
    ...productData,
    updated_at: trx.fn.now(),
  };

  const affected = await trx('products')
    .where({ id: productId, status: 'active' })
    .update(updatePayload);

  return affected;
}

/**
 * Records an opening inventory ledger transaction for a newly imported product.
 *
 * @param {Object} transactionData - Transaction payload details.
 * @param {number|string} transactionData.productId - Product primary key.
 * @param {number} transactionData.quantityChange - Opening stock quantity increase.
 * @param {number} transactionData.balanceAfter - Ending stock balance after opening transaction.
 * @param {string} transactionData.reason - Human-readable reason description.
 * @param {number} transactionData.userId - User performing the import.
 * @param {import('knex').Knex.Transaction} trx - The active transaction client.
 * @returns {Promise<void>}
 */
export async function insertInventoryTransaction(transactionData, trx) {
  await trx('inventory_transactions').insert({
    product_id: transactionData.productId,
    type: 'opening',
    quantity_change: transactionData.quantityChange,
    balance_after: transactionData.balanceAfter,
    reason: transactionData.reason,
    user_id: transactionData.userId,
  });
}

/**
 * Records an entry in the system audit log.
 *
 * @param {Object} auditData - Audit details.
 * @param {number} auditData.userId - User ID who triggered the action.
 * @param {string} auditData.action - Action string descriptor (e.g. 'product.imported').
 * @param {string} auditData.entityType - Target entity type (e.g. 'product', 'import').
 * @param {number|string} auditData.entityId - Identifier of the affected entity.
 * @param {Object} [auditData.details] - JSON serializable metadata.
 * @param {import('knex').Knex.Transaction} trx - The active transaction client.
 * @returns {Promise<void>}
 */
export async function insertAuditLog(auditData, trx) {
  await trx('audit_logs').insert({
    user_id: auditData.userId,
    action: auditData.action,
    entity_type: auditData.entityType,
    entity_id: auditData.entityId,
    details: auditData.details,
  });
}

/**
 * Retrieves a list of recent import log batches (up to 100 entries) ordered by creation date descending.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Optional Knex instance or transaction.
 * @returns {Promise<Array<Object>>} List of recent import records.
 */
export async function listImportLogs(trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const logs = await db('import_logs')
    .select(
      'id',
      'filename',
      'file_type',
      'rows_total',
      'rows_valid',
      'rows_error',
      'status',
      'created_at',
      'expires_at',
      'committed_at'
    )
    .orderBy('created_at', 'desc')
    .limit(100);

  return logs;
}
