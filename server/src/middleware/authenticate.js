/**
 * ============================================================================
 * MicroLedger Authentication & Role-Based Access Control (RBAC) Middleware
 * ============================================================================
 *
 * PURPOSE:
 * 1. Validates JWT Bearer access tokens from the Authorization header using `jose`.
 * 2. Verifies user existence and active status against the database in real time.
 * 3. Revokes sessions immediately if an account has been deactivated.
 * 4. Enforces the `mustChangePassword` flag, restricting navigation until password update.
 * 5. Provides the `requireRole(...roles)` guard to enforce Admin vs Staff permissions.
 */

import { jwtVerify } from 'jose';
import { config } from '../config/env.js';
import { requireDatabase } from '../db/knex.js';
import { HttpError } from '../utils/http-error.js';
import { findUserById, revokeUserRefreshTokens } from '../modules/auth/repository.js';

/**
 * Returns the HMAC-SHA256 secret key encoded as a Uint8Array for token verification.
 *
 * @returns {Uint8Array} Encoded JWT secret bytes.
 * @throws {HttpError} 500 SERVER_MISCONFIGURED if JWT_SECRET is missing.
 */
function jwtKey() {
  if (!config.JWT_SECRET) throw new HttpError(500, 'SERVER_MISCONFIGURED', 'Authentication is not configured.');
  return new TextEncoder().encode(config.JWT_SECRET);
}

/**
 * Authenticates incoming HTTP requests by verifying the Bearer JWT access token
 * and confirming active database status for the authenticated user.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} _res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 * @returns {Promise<void>} Resolves when authentication succeeds or passes error to next.
 */
export async function authenticate(req, _res, next) {
  try {
    const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
    if (!match) throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Authentication is required.');

    let subject;
    try {
      const { payload } = await jwtVerify(match[1], jwtKey(), {
        algorithms: ['HS256'], issuer: 'microledger', audience: 'microledger-api',
      });
      if (typeof payload.sub !== 'string' || payload.token_use !== 'access') throw new Error('Invalid access token');
      subject = payload.sub;
    } catch {
      throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Authentication is required.');
    }

    const database = requireDatabase();
    const user = await database.transaction(async (trx) => {
      const current = await findUserById(trx, subject);
      if (!current) return null;
      if (current.status !== 'active') {
        await revokeUserRefreshTokens(trx, current.id, trx.fn.now());
        return null;
      }
      return current;
    });
    if (!user) throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Authentication is required.');

    req.user = {
      id: String(user.id), username: user.username, fullName: user.full_name,
      role: user.role, status: user.status, mustChangePassword: user.must_change_password,
    };
    const isPasswordChange = req.method === 'POST'
      && req.originalUrl.split('?')[0] === '/api/v1/auth/change-password';
    if (user.must_change_password && !isPasswordChange) {
      throw new HttpError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change your password before continuing.');
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Higher-order middleware factory that restricts route access to specific user roles.
 *
 * @param {...string} allowedRoles - List of permitted role identifiers ('admin', 'staff').
 * @returns {import('express').RequestHandler} Express middleware enforcing role authorization.
 */
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new HttpError(403, 'AUTH_FORBIDDEN', 'You do not have permission to perform this action.'));
    }
    return next();
  };
}
