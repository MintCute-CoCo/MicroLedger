/**
 * ============================================================================
 * MicroLedger Server Environment Configuration & Zod Schema Validation
 * ============================================================================
 *
 * PURPOSE:
 * Loads environment variables via dotenv and strictly validates required runtime
 * parameters (PORT, CORS_ORIGIN, APP_DATABASE_URL, JWT_SECRET) using Zod.
 * Freezes configuration object to prevent runtime mutation.
 */

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    CORS_ORIGIN: z.string().url(),
    APP_DATABASE_URL: z.string().url().optional(),
    JWT_SECRET: z.string().min(32).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.APP_DATABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'APP_DATABASE_URL is strictly required in production to ensure unprivileged role isolation',
          path: ['APP_DATABASE_URL'],
        });
      }
      if (!data.JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET is required in production (must be at least 32 characters)',
          path: ['JWT_SECRET'],
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const fields = parsed.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; ');
  throw new Error(`Invalid server environment: ${fields}`);
}

export const config = Object.freeze(parsed.data);
