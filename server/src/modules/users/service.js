import { HttpError } from '../../utils/http-error.js';
import { hashPassword } from '../../utils/passwords.js';
import {
  findUser,
  insertUser,
  listUsers,
  lockActiveAdmins,
  revokeAllRefreshTokens,
  runInTransaction,
  updateUser,
  writeUserAudit,
} from './repository.js';

/**
 * Transforms a raw database user row into a safe public profile object.
 * Strictly omits confidential password hash digests (SRS-NFR-11).
 *
 * @param {Object} user - Raw database user record.
 * @returns {Object} Public user profile.
 */
function publicUser(user) {
  return {
    id: String(user.id),
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    status: user.status,
    mustChangePassword: user.must_change_password,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
}

/**
 * Maps database unique constraint violations on the username column to standard 409 responses.
 *
 * @param {Error} error - Captured database error.
 * @throws {HttpError} Translated 409 USERNAME_EXISTS or rethrows unexpected errors.
 */
function duplicateUsername(error) {
  if (error.code === '23505' && error.constraint === 'users_username_uq') {
    throw new HttpError(409, 'USERNAME_EXISTS', 'That username is already in use.');
  }
  throw error;
}

/**
 * Retrieves a list of all user accounts across the system (Admin only).
 *
 * @returns {Promise<Array<Object>>} List of public user profiles.
 */
export async function getUsers() {
  const userRows = await listUsers();
  return userRows.map(publicUser);
}

/**
 * Creates a new user account with temporary password and sets mandatory first-login password rotation.
 *
 * @param {Object} actor - Authenticated administrator creating the account.
 * @param {Object} input - Validated user creation payload.
 * @returns {Promise<Object>} Created user profile.
 * @throws {HttpError} 422 if password equals username, 409 if username exists.
 */
export async function createUser(actor, input) {
  // Prevent trivial passwords matching username
  const isSameAsUsername = input.password.toLowerCase() === input.username.toLowerCase();
  if (isSameAsUsername) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Choose a password different from the username.',
      { field: 'password' }
    );
  }

  try {
    return await runInTransaction(async (trx) => {
      // Hash password using Scrypt algorithm
      const passwordHash = await hashPassword(input.password);

      // Insert user record with must_change_password = true
      const [created] = await insertUser(trx, {
        username: input.username,
        fullName: input.fullName,
        role: input.role,
        passwordHash,
      });

      // Record system audit log entry
      await writeUserAudit(trx, actor.id, 'user.created', created.id, {
        role: created.role,
      });

      return publicUser(created);
    });
  } catch (error) {
    duplicateUsername(error);
  }
}

/**
 * Updates an existing user's display name, role, or active status.
 * Enforces self-deactivation protection and safeguards the last active administrator.
 *
 * @param {Object} actor - Authenticated administrator performing the update.
 * @param {number|string} id - Target user primary key.
 * @param {Object} changes - Validated field modifications.
 * @returns {Promise<Object>} Updated user profile.
 * @throws {HttpError} 404 if not found, 409 if self-deactivating or removing last admin.
 */
export async function changeUser(actor, id, changes) {
  return await runInTransaction(async (trx) => {
    // Verify target user existence
    const target = await findUser(trx, id);
    if (!target) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    // Guard: Administrators cannot deactivate their own active account
    const isSelfDeactivation = String(actor.id) === String(id) && changes.status === 'inactive';
    if (isSelfDeactivation) {
      throw new HttpError(
        409,
        'USER_CANNOT_DEACTIVATE_SELF',
        'You cannot deactivate your own account.'
      );
    }

    // Guard: Prevent deactivating or demoting the last remaining active Administrator (AC-004)
    const isTargetActiveAdmin = target.role === 'admin' && target.status === 'active';
    const isDemotingAdmin = changes.role !== undefined && changes.role !== 'admin';
    const isDeactivatingAdmin = changes.status !== undefined && changes.status !== 'active';

    if (isTargetActiveAdmin && (isDemotingAdmin || isDeactivatingAdmin)) {
      const activeAdmins = await lockActiveAdmins(trx);
      if (activeAdmins.length <= 1) {
        throw new HttpError(
          409,
          'LAST_ACTIVE_ADMIN',
          'The last active Admin cannot be deactivated or demoted.'
        );
      }
    }

    // Build update dictionary
    const updatePayload = {};
    if (changes.fullName !== undefined) {
      updatePayload.full_name = changes.fullName;
    }
    if (changes.role !== undefined) {
      updatePayload.role = changes.role;
    }
    if (changes.status !== undefined) {
      updatePayload.status = changes.status;
    }

    const [updated] = await updateUser(trx, id, updatePayload);

    // If an account is deactivated, terminate all active refresh token sessions immediately
    if (changes.status === 'inactive') {
      await revokeAllRefreshTokens(trx, id);
    }

    // Record system audit log entry
    await writeUserAudit(trx, actor.id, 'user.updated', id, changes);

    return publicUser(updated);
  });
}

/**
 * Resets a user's password, sets mandatory password change on next login,
 * and immediately revokes all current sessions (AC-004 / AC-005).
 *
 * @param {Object} actor - Authenticated administrator resetting the password.
 * @param {number|string} id - Target user primary key.
 * @param {string} password - New temporary password string.
 * @returns {Promise<{ status: string }>} Success confirmation.
 * @throws {HttpError} 404 if user not found, 422 if password matches username.
 */
export async function resetUserPassword(actor, id, password) {
  return await runInTransaction(async (trx) => {
    const target = await findUser(trx, id);
    if (!target) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const isSameAsUsername = password.toLowerCase() === target.username.toLowerCase();
    if (isSameAsUsername) {
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        'Choose a password different from the username.',
        { field: 'password' }
      );
    }

    const passwordHash = await hashPassword(password);

    await updateUser(trx, id, {
      password_hash: passwordHash,
      must_change_password: true,
    });

    // Revoke all existing sessions
    await revokeAllRefreshTokens(trx, id);

    // Record system audit log entry
    await writeUserAudit(trx, actor.id, 'user.password_reset', id, {});

    return { status: 'ok' };
  });
}
