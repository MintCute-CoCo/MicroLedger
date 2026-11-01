import { createHash, randomBytes } from 'node:crypto';
import { SignJWT } from 'jose';
import { config } from '../../config/env.js';
import { requireDatabase } from '../../db/knex.js';
import { HttpError } from '../../utils/http-error.js';
import { hashPassword, verifyPassword } from '../../utils/passwords.js';
import {
  findRefreshTokenForUpdate,
  findUserById,
  findUserByUsername,
  insertRefreshToken,
  recordSuccessfulLogin,
  revokeRefreshToken,
  revokeRefreshTokenByHash,
  revokeUserRefreshTokens,
  updateFailedLogin,
  updatePassword,
  writeAuthAudit,
} from './repository.js';

// Lifetime of access tokens: 15 minutes (in seconds)
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

// Lifetime of rotating refresh tokens: 8 hours (in milliseconds)
const REFRESH_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

// Temporary lockout duration upon consecutive failed logins: 15 minutes (in milliseconds)
const LOCKOUT_MS = 15 * 60 * 1000;

// Pre-computed dummy password hash used during authentication for non-existent or inactive users.
// Ensures password verification consumes constant time, preventing timing-based user enumeration.
const dummyRandomKey = randomBytes(24).toString('hex');
const DUMMY_PASSWORD_HASH = await hashPassword(dummyRandomKey);

/**
 * Retrieves the cryptographic key used for signing JWT access tokens.
 *
 * Purpose:
 * Reads and validates the JWT_SECRET from server configuration, converting it
 * into a Uint8Array suitable for the `jose` cryptographic library.
 *
 * @returns {Uint8Array} Encoded secret key bytes.
 * @throws {HttpError} Throws 500 SERVER_MISCONFIGURED if JWT_SECRET is unset.
 */
function accessKey() {
  const secret = config.JWT_SECRET;
  if (!secret) {
    throw new HttpError(500, 'SERVER_MISCONFIGURED', 'Authentication is not configured.');
  }

  const encoder = new TextEncoder();
  const encodedKey = encoder.encode(secret);
  return encodedKey;
}

/**
 * Computes a SHA-256 cryptographic digest of a token string.
 *
 * Purpose:
 * Transforms plaintext refresh tokens into irreversible SHA-256 hashes before
 * database storage, ensuring tokens cannot be leaked from database backups.
 *
 * @param {string} token - The plaintext token string.
 * @returns {string} Hexadecimal SHA-256 digest string.
 */
function tokenHash(token) {
  const hash = createHash('sha256');
  hash.update(token);
  const digestString = hash.digest('hex');
  return digestString;
}

/**
 * Formats an internal database user row into a safe, client-facing public profile.
 *
 * Purpose:
 * Strips confidential credentials (such as password hashes, salts, and failed attempt counters)
 * and formats field names to standard camelCase.
 *
 * @param {Object} user - Raw database user record.
 * @returns {Object} Publicly safe user profile object.
 */
function publicUser(user) {
  const formattedUser = {
    id: String(user.id),
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    mustChangePassword: user.must_change_password,
  };

  return formattedUser;
}

/**
 * Generates and signs a cryptographically secure JWT access token for an authenticated user.
 *
 * Purpose:
 * Creates a signed JWT carrying user identity claims, role authorization data, and expiration time.
 *
 * @param {Object} user - The authenticated user record.
 * @returns {Promise<string>} Signed compact JWT string.
 */
async function createAccessToken(user) {
  const userIdString = String(user.id);
  const secretKey = accessKey();
  const tokenDuration = `${ACCESS_TOKEN_TTL_SECONDS}s`;

  // Instantiate JWT builder with token claims
  const jwt = new SignJWT({ token_use: 'access' });
  jwt.setProtectedHeader({ alg: 'HS256' });
  jwt.setSubject(userIdString);
  jwt.setIssuer('microledger');
  jwt.setAudience('microledger-api');
  jwt.setIssuedAt();
  jwt.setExpirationTime(tokenDuration);

  // Sign the token with the server's access key
  const signedJwt = await jwt.sign(secretKey);
  return signedJwt;
}

/**
 * Generates a high-entropy, cryptographically random refresh token.
 *
 * Purpose:
 * Produces a URL-safe 32-byte pseudo-random string for use as a rotating refresh token.
 *
 * @returns {string} URL-safe base64-encoded token string.
 */
function newRefreshToken() {
  const randomBuffer = randomBytes(32);
  const base64UrlToken = randomBuffer.toString('base64url');
  return base64UrlToken;
}

/**
 * Helper function that returns a standardized generic authentication error.
 *
 * Purpose:
 * Creates a generic 401 AUTH_INVALID_CREDENTIALS error to prevent leaking whether
 * an entered username exists or whether the password was incorrect.
 *
 * @returns {HttpError} Generic 401 unauthorized error.
 */
function invalidCredentials() {
  return new HttpError(
    401,
    'AUTH_INVALID_CREDENTIALS',
    'Username or password is incorrect.'
  );
}

/**
 * Authenticates a user with username and password, managing lockouts and session tokens.
 *
 * Purpose:
 * Implements the login business logic:
 * 1. Checks account status and lockout thresholds.
 * 2. Compares credentials using constant-time verification.
 * 3. Enforces 5-attempt brute-force protection with 15-minute lockout.
 * 4. Issues short-lived access tokens and rotating refresh tokens.
 *
 * @param {Object} credentials - Login credentials.
 * @param {string} credentials.username - User's account username.
 * @param {string} credentials.password - Raw submitted password.
 * @returns {Promise<Object>} Object containing accessToken, public user profile, refreshToken, and expiresIn.
 * @throws {HttpError} Throws 401 on invalid credentials, 423 when account is locked.
 */
export async function login({ username, password }) {
  const database = requireDatabase();
  const normalizedUsername = username.trim();
  const now = new Date();

  // Execute credential validation and token generation inside a database transaction
  const outcome = await database.transaction(async (trx) => {
    // 1. Look up user by normalized lowercase username with row-level lock
    const user = await findUserByUsername(trx, normalizedUsername, true);

    // If user does not exist or is inactive, verify against dummy hash to prevent timing attacks
    if (!user || user.status !== 'active') {
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      return { failure: 'credentials' };
    }

    // 2. Check if user account is currently locked out
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until);
      if (lockExpiry > now) {
        return { failure: 'locked' };
      }
    }

    // Determine current failed attempt baseline (reset to 0 if previous lockout expired)
    let currentAttempts = user.failed_attempts;
    if (user.locked_until) {
      currentAttempts = 0;
    }

    // 3. Verify submitted password against stored Argon2id/bcrypt hash
    const passwordMatches = await verifyPassword(password, user.password_hash);

    if (!passwordMatches) {
      // Increment failed attempt counter
      const nextAttempts = currentAttempts + 1;

      // Lock account for 15 minutes if 5 consecutive failed attempts are reached
      let lockedUntil = null;
      if (nextAttempts >= 5) {
        const lockoutExpiration = now.getTime() + LOCKOUT_MS;
        lockedUntil = new Date(lockoutExpiration);
      }

      await updateFailedLogin(trx, user.id, nextAttempts, lockedUntil);

      const isNewlyLocked = Boolean(lockedUntil);
      return {
        failure: 'credentials',
        newlyLocked: isNewlyLocked,
        userId: user.id,
      };
    }

    // 4. Successful login: reset failed counters and issue tokens
    const refreshToken = newRefreshToken();
    const hashedToken = tokenHash(refreshToken);
    const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    await recordSuccessfulLogin(trx, user.id);
    await insertRefreshToken(trx, {
      userId: user.id,
      tokenHash: hashedToken,
      expiresAt: refreshExpiresAt,
    });

    return {
      user: user,
      refreshToken: refreshToken,
    };
  });

  // Write security audit log if user reached the lockout limit
  if (outcome.newlyLocked) {
    await writeAuthAudit(database, {
      userId: outcome.userId,
      action: 'auth.login_locked',
      entityId: outcome.userId,
      details: { failed_attempts: 5, lockout_minutes: 15 },
    });
  }

  // Handle failure conditions
  if (outcome.failure === 'locked') {
    throw new HttpError(423, 'AUTH_LOCKED', 'Account temporarily locked. Try again later.');
  }

  if (outcome.failure) {
    throw invalidCredentials();
  }

  // 5. Generate signed JWT access token and return authentication bundle
  const accessToken = await createAccessToken(outcome.user);
  const userProfile = publicUser(outcome.user);

  const loginResponse = {
    accessToken: accessToken,
    user: userProfile,
    refreshToken: outcome.refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };

  return loginResponse;
}

/**
 * Rotates an existing refresh token and generates a new access token.
 *
 * Purpose:
 * Implements rotating refresh token logic according to security requirement AC-002:
 * 1. Validates the incoming refresh token.
 * 2. Checks token expiration and revocation status.
 * 3. Revokes the used refresh token immediately.
 * 4. Issues a replacement refresh token and a new access token.
 *
 * @param {string} rawToken - Plaintext refresh token string received from cookie.
 * @returns {Promise<Object>} Object containing new accessToken, user profile, new refreshToken, and expiresIn.
 * @throws {HttpError} Throws 401 AUTH_INVALID_CREDENTIALS if token is missing, expired, revoked, or user inactive.
 */
export async function refreshSession(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw invalidCredentials();
  }

  const database = requireDatabase();
  const now = new Date();
  const incomingHash = tokenHash(rawToken);

  const outcome = await database.transaction(async (trx) => {
    // 1. Fetch token record with row lock to prevent replay attacks
    const record = await findRefreshTokenForUpdate(trx, incomingHash);

    if (!record) {
      return { failure: true };
    }

    // 2. Check if token was already revoked or has expired
    const isRevoked = Boolean(record.revoked_at);
    const tokenExpiresAt = new Date(record.expires_at);
    const isExpired = tokenExpiresAt <= now;

    if (isRevoked || isExpired) {
      if (!isRevoked) {
        // Mark as revoked now to prevent future usage
        await revokeRefreshToken(trx, record.refresh_id, now);
      }
      return { failure: true };
    }

    // 3. Verify user account is still active
    if (record.status !== 'active') {
      await revokeUserRefreshTokens(trx, record.user_id, now);
      return { failure: true };
    }

    // 4. Token rotation: revoke current refresh token and issue a new one
    const nextToken = newRefreshToken();
    const nextTokenHash = tokenHash(nextToken);
    const nextTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

    await revokeRefreshToken(trx, record.refresh_id, now);
    await insertRefreshToken(trx, {
      userId: record.user_id,
      tokenHash: nextTokenHash,
      expiresAt: nextTokenExpiresAt,
    });

    const activeUser = {
      id: record.user_id,
      username: record.username,
      full_name: record.full_name,
      role: record.role,
      must_change_password: record.must_change_password,
    };

    return {
      user: activeUser,
      refreshToken: nextToken,
    };
  });

  if (outcome.failure) {
    throw invalidCredentials();
  }

  // 5. Generate new access token
  const accessToken = await createAccessToken(outcome.user);
  const userProfile = publicUser(outcome.user);

  const refreshResponse = {
    accessToken: accessToken,
    user: userProfile,
    refreshToken: outcome.refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };

  return refreshResponse;
}

/**
 * Terminates a user session by revoking the provided refresh token.
 *
 * Purpose:
 * Invalidates the caller's refresh token record in the database upon user logout.
 *
 * @param {string} rawToken - Plaintext refresh token from cookie.
 * @returns {Promise<void>}
 */
export async function logout(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return;
  }

  const database = requireDatabase();
  const hashedToken = tokenHash(rawToken);
  const currentTime = database.fn.now();

  // Mark the matching refresh token as revoked via repository
  await revokeRefreshTokenByHash(database, hashedToken, currentTime);
}

/**
 * Updates the authenticated user's own password and revokes any other active sessions.
 *
 * Purpose:
 * Validates current credentials, hashes the new password, updates the user row,
 * revokes other active refresh tokens (keeping current session), and writes an audit entry.
 *
 * @param {Object} user - The authenticated user object from req.user.
 * @param {Object} passwordPayload - Current and new password data.
 * @param {string} passwordPayload.currentPassword - User's current password.
 * @param {string} passwordPayload.newPassword - Desired new password.
 * @param {string} [currentRefreshToken] - Refresh token of the current active session.
 * @returns {Promise<void>}
 * @throws {HttpError} Throws 422 if new password matches username, 401 on incorrect current password.
 */
export async function changeOwnPassword(user, { currentPassword, newPassword }, currentRefreshToken) {
  // Prevent users from setting their password to their username
  const normalizedNewPassword = newPassword.toLowerCase();
  const normalizedUsername = user.username.toLowerCase();

  if (normalizedNewPassword === normalizedUsername) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Choose a password different from your username.',
      { field: 'newPassword' }
    );
  }

  const database = requireDatabase();
  const now = new Date();

  await database.transaction(async (trx) => {
    // 1. Fetch current user record with row lock
    const currentUser = await findUserById(trx, user.id, true);

    if (!currentUser || currentUser.status !== 'active') {
      throw invalidCredentials();
    }

    // 2. Verify current password matches stored password hash
    const isCurrentPasswordCorrect = await verifyPassword(currentPassword, currentUser.password_hash);
    if (!isCurrentPasswordCorrect) {
      throw invalidCredentials();
    }

    // 3. Hash the new password and update user record
    const newPasswordHash = await hashPassword(newPassword);
    await updatePassword(trx, currentUser.id, newPasswordHash);

    // 4. Revoke all other active refresh tokens, preserving the current session
    let exceptHash = null;
    if (currentRefreshToken) {
      exceptHash = tokenHash(currentRefreshToken);
    }
    await revokeUserRefreshTokens(trx, currentUser.id, now, exceptHash);

    // 5. Record password change audit trail
    await writeAuthAudit(trx, {
      userId: currentUser.id,
      action: 'auth.password_changed',
      entityId: currentUser.id,
      details: {},
    });
  });
}
