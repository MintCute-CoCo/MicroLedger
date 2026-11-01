/**
 * Authentication Repository
 *
 * Handles database operations related to user authentication, credential verification,
 * session refresh tokens, and authentication audit logs.
 * Adheres strictly to the architectural rule: "Repositories do SQL only."
 */

/**
 * Finds a user record by username using case-insensitive comparison.
 *
 * Purpose:
 * Queries the `users` table matching the lowercase username to allow case-insensitive
 * logins, optionally applying a row-level lock (`FOR UPDATE`) for concurrency safety.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {string} username - Normalized username to look up.
 * @param {boolean} [lock=false] - Whether to acquire a pessimistic row lock.
 * @returns {import('knex').Knex.QueryBuilder} Knex query resolving to the matching user record, or undefined.
 */
export function findUserByUsername(trx, username, lock = false) {
  // 1. Build query matching lowercase username
  const query = trx('users');
  query.whereRaw('lower(username) = lower(?)', [username]);
  query.first();

  // 2. Conditionally apply pessimistic row locking
  if (lock) {
    query.forUpdate();
  }

  return query;
}

/**
 * Finds a user record by their primary key ID.
 *
 * Purpose:
 * Retrieves a single user record by ID, optionally applying a pessimistic row lock.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} id - Primary key ID of the user.
 * @param {boolean} [lock=false] - Whether to acquire a row lock.
 * @returns {import('knex').Knex.QueryBuilder} Knex query resolving to the user row, or undefined.
 */
export function findUserById(trx, id, lock = false) {
  // 1. Build query filtering by user ID
  const query = trx('users');
  query.where({ id });
  query.first();

  // 2. Conditionally apply pessimistic row locking
  if (lock) {
    query.forUpdate();
  }

  return query;
}

/**
 * Updates a user's failed login attempt counter and temporary lockout timestamp.
 *
 * Purpose:
 * Records failed authentication attempts for brute-force protection, setting
 * the lockout timestamp if the threshold is reached.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} id - Primary key ID of the user.
 * @param {number} attempts - Current count of consecutive failed login attempts.
 * @param {Date|null} lockedUntil - Timestamp until which the account is locked, or null.
 * @returns {import('knex').Knex.QueryBuilder} Knex query updating the user row.
 */
export function updateFailedLogin(trx, id, attempts, lockedUntil) {
  const updatePayload = {
    failed_attempts: attempts,
    locked_until: lockedUntil,
  };

  const query = trx('users');
  query.where({ id });
  query.update(updatePayload);

  return query;
}

/**
 * Resets failed login counters and updates the last login timestamp upon successful authentication.
 *
 * Purpose:
 * Clears lockout state and marks the current timestamp as the user's most recent login.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} id - Primary key ID of the user.
 * @returns {import('knex').Knex.QueryBuilder} Knex query updating the user row.
 */
export function recordSuccessfulLogin(trx, id) {
  const currentDbTime = trx.fn.now();
  const updatePayload = {
    failed_attempts: 0,
    locked_until: null,
    last_login_at: currentDbTime,
  };

  const query = trx('users');
  query.where({ id });
  query.update(updatePayload);

  return query;
}

/**
 * Inserts a new refresh token record into the database.
 *
 * Purpose:
 * Persists a hashed refresh token tied to a user ID and expiration timestamp.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {Object} tokenData - Token insertion parameters.
 * @param {number|string} tokenData.userId - ID of the user the token is issued to.
 * @param {string} tokenData.tokenHash - SHA-256 hash of the refresh token.
 * @param {Date} tokenData.expiresAt - Expiration timestamp of the refresh token.
 * @returns {import('knex').Knex.QueryBuilder} Knex query inserting the refresh token record.
 */
export function insertRefreshToken(trx, { userId, tokenHash, expiresAt }) {
  const insertPayload = {
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  };

  const query = trx('refresh_tokens');
  query.insert(insertPayload);

  return query;
}

/**
 * Looks up an existing refresh token with its associated user details, locking the row.
 *
 * Purpose:
 * Retrieves a refresh token record by its SHA-256 hash while joining user information,
 * acquiring a pessimistic row lock on the refresh token row to prevent concurrent reuse.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {string} tokenHash - SHA-256 hash of the incoming refresh token.
 * @returns {import('knex').Knex.QueryBuilder} Knex query resolving to token details and user profile.
 */
export function findRefreshTokenForUpdate(trx, tokenHash) {
  const query = trx('refresh_tokens as rt');

  // Join the users table to retrieve current user status and roles
  query.join('users as u', 'u.id', 'rt.user_id');

  // Select required columns from token and user tables
  query.select(
    'rt.id as refresh_id',
    'rt.user_id',
    'rt.expires_at',
    'rt.revoked_at',
    'u.username',
    'u.full_name',
    'u.role',
    'u.status',
    'u.must_change_password'
  );

  // Filter by matching token hash
  query.where('rt.token_hash', tokenHash);

  // Lock the refresh_tokens row specifically
  query.forUpdate('rt');

  // Return the first matching row
  query.first();

  return query;
}

/**
 * Marks a specific refresh token as revoked by its primary key ID.
 *
 * Purpose:
 * Invalidates an individual refresh token by setting its revoked_at timestamp,
 * ensuring it cannot be used again (token rotation policy).
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} id - Primary key ID of the refresh token.
 * @param {Date} revokedAt - Timestamp when revocation occurred.
 * @returns {import('knex').Knex.QueryBuilder} Knex query updating the refresh token row.
 */
export function revokeRefreshToken(trx, id, revokedAt) {
  const updatePayload = {
    revoked_at: revokedAt,
  };

  const query = trx('refresh_tokens');
  query.where({ id });
  query.whereNull('revoked_at');
  query.update(updatePayload);

  return query;
}

/**
 * Marks a specific refresh token as revoked by its SHA-256 token hash.
 *
 * Purpose:
 * Invalidates a refresh token row during logout without needing to load the row first.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db - Knex database or transaction instance.
 * @param {string} tokenHash - SHA-256 hash of the token to revoke.
 * @param {Date|Object} revokedAt - Timestamp when revocation occurred.
 * @returns {import('knex').Knex.QueryBuilder} Knex query updating the refresh token row.
 */
export function revokeRefreshTokenByHash(db, tokenHash, revokedAt) {
  const updatePayload = {
    revoked_at: revokedAt,
  };

  const query = db('refresh_tokens');
  query.where({ token_hash: tokenHash });
  query.whereNull('revoked_at');
  query.update(updatePayload);

  return query;
}

/**
 * Revokes all active refresh tokens for a user, with an optional exception.
 *
 * Purpose:
 * Invalidates all active sessions for a user (e.g., when changing password or
 * deactivating an account), optionally preserving the current session's token.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} userId - User ID whose tokens are being revoked.
 * @param {Date} revokedAt - Timestamp when revocation occurred.
 * @param {string|null} [exceptTokenHash=null] - Optional token hash to preserve from revocation.
 * @returns {import('knex').Knex.QueryBuilder} Knex query updating the refresh tokens.
 */
export function revokeUserRefreshTokens(trx, userId, revokedAt, exceptTokenHash = null) {
  const updatePayload = {
    revoked_at: revokedAt,
  };

  const query = trx('refresh_tokens');
  query.where({ user_id: userId });
  query.whereNull('revoked_at');

  // If an exception token hash is supplied, exclude it from revocation
  if (exceptTokenHash) {
    query.whereNot({ token_hash: exceptTokenHash });
  }

  query.update(updatePayload);

  return query;
}

/**
 * Updates a user's password hash and clears the must_change_password flag.
 *
 * Purpose:
 * Stores the newly hashed password in the users table and resets the forced
 * password change requirement.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} userId - ID of the user updating their password.
 * @param {string} passwordHash - Argon2id or bcrypt password hash string.
 * @returns {import('knex').Knex.QueryBuilder} Knex query updating the user row.
 */
export function updatePassword(trx, userId, passwordHash) {
  const updatePayload = {
    password_hash: passwordHash,
    must_change_password: false,
  };

  const query = trx('users');
  query.where({ id: userId });
  query.update(updatePayload);

  return query;
}

/**
 * Inserts an authentication-related audit log entry into `audit_logs`.
 *
 * Purpose:
 * Records an immutable audit log entry documenting an authentication event
 * (such as account lockout or password change).
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {Object} auditData - Audit entry attributes.
 * @param {number|string} auditData.userId - User ID associated with the audit event.
 * @param {string} auditData.action - Action identifier string (e.g. 'auth.login_locked').
 * @param {number|string} [auditData.entityId] - Target entity ID.
 * @param {Object} [auditData.details={}] - Additional event metadata.
 * @returns {import('knex').Knex.QueryBuilder} Knex query inserting the audit log row.
 */
export function writeAuthAudit(trx, { userId, action, entityId = null, details = {} }) {
  const auditRow = {
    user_id: userId,
    action: action,
    entity_type: 'user',
    entity_id: entityId ?? userId,
    details: details,
  };

  const query = trx('audit_logs');
  query.insert(auditRow);

  return query;
}
