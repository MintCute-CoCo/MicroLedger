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
 * Retrieves all registered user accounts ordered alphabetically by full name.
 * Omits confidential password hash digests.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<Object>>} List of user accounts.
 */
export async function listUsers(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  return await db('users')
    .select(
      'id',
      'username',
      'full_name',
      'role',
      'status',
      'must_change_password',
      'last_login_at',
      'created_at'
    )
    .orderBy('full_name', 'asc');
}

/**
 * Finds a single user record by primary key ID.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Knex client or transaction.
 * @param {number|string} id - User primary key.
 * @returns {Promise<Object|undefined>} User record or undefined.
 */
export async function findUser(trxOrDb, id) {
  const db = trxOrDb || requireDatabase();
  return await db('users').where({ id }).first();
}

/**
 * Inserts a newly provisioned user record into the database.
 * Sets must_change_password to true by default for mandatory first-login password rotation.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {Object} userData - User record details.
 * @param {string} userData.username - Unique login username.
 * @param {string} userData.fullName - User's display full name.
 * @param {string} userData.role - Assigned role ('admin' or 'staff').
 * @param {string} userData.passwordHash - Scrypt hashed password string.
 * @returns {Promise<Array<Object>>} Inserted user record fields (omits password hash).
 */
export async function insertUser(trx, { username, fullName, role, passwordHash }) {
  return await trx('users')
    .insert({
      username,
      full_name: fullName,
      role,
      password_hash: passwordHash,
      must_change_password: true,
    })
    .returning([
      'id',
      'username',
      'full_name',
      'role',
      'status',
      'must_change_password',
      'last_login_at',
      'created_at',
    ]);
}

/**
 * Locks all currently active administrator rows using SELECT ... FOR UPDATE.
 * Used during user status/role modifications to guard against deactivating or demoting
 * the last remaining active Administrator.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @returns {Promise<Array<{ id: number }>>} Array of active admin IDs.
 */
export async function lockActiveAdmins(trx) {
  return await trx('users')
    .select('id')
    .where({ role: 'admin', status: 'active' })
    .orderBy('id')
    .forUpdate();
}

/**
 * Updates user attributes and returns updated profile fields.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number|string} id - User primary key.
 * @param {Object} changes - Field updates to apply.
 * @returns {Promise<Array<Object>>} Updated user record fields.
 */
export async function updateUser(trx, id, changes) {
  return await trx('users')
    .where({ id })
    .update(changes)
    .returning([
      'id',
      'username',
      'full_name',
      'role',
      'status',
      'must_change_password',
      'last_login_at',
      'created_at',
    ]);
}

/**
 * Revokes all active refresh tokens for a user, effectively terminating their sessions across all devices.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number|string} userId - User primary key.
 * @returns {Promise<number>} Number of revoked tokens.
 */
export async function revokeAllRefreshTokens(trx, userId) {
  return await trx('refresh_tokens')
    .where({ user_id: userId })
    .whereNull('revoked_at')
    .update({
      revoked_at: trx.fn.now(),
    });
}

/**
 * Records an audit log entry for user account lifecycle events.
 *
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @param {number} actorId - ID of user performing the action.
 * @param {string} action - Action descriptor (e.g. 'user.created', 'user.updated').
 * @param {number|string} userId - Affected user primary key.
 * @param {Object} [details={}] - Structured JSON details.
 * @returns {Promise<void>}
 */
export async function writeUserAudit(trx, actorId, action, userId, details = {}) {
  await trx('audit_logs').insert({
    user_id: actorId,
    action,
    entity_type: 'user',
    entity_id: userId,
    details,
  });
}
