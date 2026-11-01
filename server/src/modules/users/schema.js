import { z } from 'zod';

/**
 * Validation schema for usernames.
 * Must be 3 to 50 characters, containing only alphanumeric characters, dots, underscores, or hyphens.
 */
const usernameSchema = z
  .string({
    required_error: 'Username is required.',
  })
  .trim()
  .min(3, 'Username must be at least 3 characters.')
  .max(50, 'Username may not exceed 50 characters.')
  .regex(
    /^[a-z0-9._-]+$/i,
    'Use letters, numbers, dots, underscores, or hyphens.'
  );

/**
 * Validation schema for user passwords.
 * Must be between 8 and 128 characters in length.
 */
const passwordSchema = z
  .string({
    required_error: 'Password is required.',
  })
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password may not exceed 128 characters.');

/**
 * Validation schema for creating a new system user (Staff or Admin).
 */
export const createUserSchema = z
  .object({
    username: usernameSchema,
    fullName: z
      .string({
        required_error: 'Full name is required.',
      })
      .trim()
      .min(1, 'Full name cannot be empty.')
      .max(100, 'Full name may not exceed 100 characters.'),
    role: z.enum(['admin', 'staff'], {
      errorMap: () => ({ message: 'Role must be either "admin" or "staff".' }),
    }),
    password: passwordSchema,
  })
  .strict();

/**
 * Validation schema for updating user details, roles, or active status.
 * Enforces that at least one attribute is provided for modification.
 */
export const updateUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Full name cannot be empty.')
      .max(100, 'Full name may not exceed 100 characters.')
      .optional(),
    role: z
      .enum(['admin', 'staff'], {
        errorMap: () => ({ message: 'Role must be either "admin" or "staff".' }),
      })
      .optional(),
    status: z
      .enum(['active', 'inactive'], {
        errorMap: () => ({ message: 'Status must be "active" or "inactive".' }),
      })
      .optional(),
  })
  .strict()
  .refine(
    (body) => {
      const keys = Object.keys(body);
      return keys.length > 0;
    },
    {
      message: 'Provide at least one field to update.',
    }
  );

/**
 * Validation schema for an administrator resetting a user's password.
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
  })
  .strict();
