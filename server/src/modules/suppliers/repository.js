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
 * Retrieves supplier records based on role privileges and status filters.
 * Non-admin staff users are strictly restricted to viewing active suppliers only.
 *
 * @param {string} userRole - Role of the requesting user ('admin' or 'staff').
 * @param {string} [statusFilter='active'] - Status filter ('active' or 'all').
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<Object>>} List of supplier records ordered by name.
 */
export async function fetchSuppliers(userRole, statusFilter = 'active', trxOrDb) {
  const db = trxOrDb || requireDatabase();

  const query = db('suppliers as s').select(
    's.id',
    's.name',
    's.contact_person',
    's.phone',
    's.email',
    's.notes',
    's.status'
  );

  if (statusFilter !== 'all' || userRole !== 'admin') {
    query.where('s.status', 'active');
  }

  return await query.orderBy('s.name');
}

/**
 * Inserts a new supplier record into the suppliers table.
 *
 * @param {Object} supplierData - Supplier attributes to insert.
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @returns {Promise<Array<Object>>} Inserted supplier record.
 */
export async function insertSupplier(supplierData, trx) {
  return await trx('suppliers')
    .insert({
      ...supplierData,
      status: 'active',
    })
    .returning('*');
}

/**
 * Finds a supplier record by primary key ID with optional row locking.
 *
 * @param {number|string} id - Supplier primary key.
 * @param {boolean} [lock=false] - Whether to apply SELECT ... FOR UPDATE.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Object|undefined>} Supplier record or undefined.
 */
export async function findSupplierById(id, lock = false, trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const query = db('suppliers').where({ id }).first();

  if (lock) {
    return await query.forUpdate();
  }
  return await query;
}

/**
 * Checks if a supplier has any open (uncompleted, uncancelled, unrejected) warranty claims.
 * Used as a business guard to prevent deactivating suppliers who are actively processing claims.
 *
 * @param {number|string} supplierId - Target supplier primary key.
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @returns {Promise<Object|undefined>} Found open claim record or undefined.
 */
export async function findOpenClaimsBySupplierId(supplierId, trx) {
  return await trx('warranty_claims')
    .where({ supplier_id: supplierId })
    .whereNotIn('status', ['Completed', 'Rejected', 'Cancelled'])
    .first('id');
}

/**
 * Updates supplier record fields.
 *
 * @param {number|string} id - Supplier primary key.
 * @param {Object} updateData - Modified field values.
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @returns {Promise<number>} Number of affected rows.
 */
export async function updateSupplierRecord(id, updateData, trx) {
  return await trx('suppliers')
    .where({ id })
    .update(updateData);
}

/**
 * Inserts an audit log entry for supplier creation or updates.
 *
 * @param {number} actorId - User ID who triggered the action.
 * @param {string} action - Action descriptor (e.g. 'supplier.created', 'supplier.updated').
 * @param {number|string} entityId - Supplier ID.
 * @param {Object} details - Structured JSON event details.
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @returns {Promise<void>}
 */
export async function writeSupplierAudit(actorId, action, entityId, details, trx) {
  await trx('audit_logs').insert({
    user_id: actorId,
    action,
    entity_type: 'supplier',
    entity_id: entityId,
    details,
  });
}
