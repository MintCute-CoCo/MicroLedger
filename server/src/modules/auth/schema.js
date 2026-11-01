import { z } from 'zod';

/**
 * Authentication Module Validation Schemas
 *
 * Purpose:
 * Defines strict Zod validation schemas for authentication and credential management requests,
 * ensuring incoming payloads meet the required formats, character lengths, and password security rules.
 */

/**
 * Validation schema for user login requests.
 *
 * Fields:
 * - username: String, trimmed, between 1 and 50 characters.
 * - password: Raw password string, minimum 8 characters, maximum 128 characters.
 */
export const loginSchema = z
  .object({
    // Username must be non-empty and within the database VARCHAR(50) limit
    username: z
      .string()
      .trim()
      .min(1, 'Username is required')
      .max(50, 'Username must not exceed 50 characters'),

    // Password must satisfy the minimum length requirement (8 chars)
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters'),
  })
  .strict();

/**
 * Validation schema for password change requests.
 *
 * Fields:
 * - currentPassword: Raw existing password string, 1 to 128 characters.
 * - newPassword: New password string, minimum 8 characters, maximum 128 characters.
 */
export const changePasswordSchema = z
  .object({
    // Current password provided for authentication confirmation
    currentPassword: z
      .string()
      .min(1, 'Current password is required')
      .max(128, 'Current password must not exceed 128 characters'),

    // New password meeting complexity/length requirements
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(128, 'New password must not exceed 128 characters'),
  })
  .strict();
