/**
 * ============================================================================
 * MicroLedger Cryptographic Password Hashing Utility
 * ============================================================================
 *
 * PURPOSE:
 * Provides secure password hashing using bcrypt with 12 salt rounds combined
 * with SHA-256 pre-hashing. Pre-hashing overcomes bcrypt's 72-byte truncation limit,
 * ensuring arbitrary password lengths are hashed with constant entropy and satisfying
 * academic security guidelines (SRS-NFR-11).
 */

import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_SHA256_PREFIX = 'bcrypt-sha256:';

/**
 * Computes a SHA-256 hex digest of a password string before passing to bcrypt.
 *
 * @param {string} password - Raw plaintext password.
 * @returns {string} Hex-encoded SHA-256 hash.
 */
function prehash(password) {
  return createHash('sha256').update(password, 'utf8').digest('hex');
}

/**
 * Hashes a plaintext password using bcrypt-SHA256 with 12 salt rounds.
 *
 * @param {string} password - Plaintext password to hash.
 * @returns {Promise<string>} Prefixed hashed password string.
 */
export async function hashPassword(password) {
  return `${BCRYPT_SHA256_PREFIX}${await bcrypt.hash(prehash(password), 12)}`;
}

/**
 * Verifies a candidate password against a stored bcrypt hash.
 * Supports both pre-hashed and legacy bcrypt format hashes.
 *
 * @param {string} password - Plaintext password submitted by user.
 * @param {string} storedHash - Stored hash string from database.
 * @returns {Promise<boolean>} True if password matches, false otherwise.
 */
export async function verifyPassword(password, storedHash) {
  if (storedHash.startsWith(BCRYPT_SHA256_PREFIX)) {
    return bcrypt.compare(prehash(password), storedHash.slice(BCRYPT_SHA256_PREFIX.length));
  }
  // Accept existing seed hashes while databases transition to bcrypt-SHA256.
  return bcrypt.compare(password, storedHash);
}
