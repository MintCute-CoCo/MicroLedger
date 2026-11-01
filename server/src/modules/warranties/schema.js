import { z } from 'zod';

/**
 * Common schema validator for primary key IDs.
 * Accepts numeric strings or positive integers, converting both to String.
 */
const id = z
  .union([
    z.string().regex(/^\d+$/, 'ID must be a numeric string.'),
    z.number().int().positive('ID must be a positive integer.'),
  ])
  .transform(String);

/**
 * Validation schema for querying, searching, and filtering registered warranty records.
 */
export const warrantyListSchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, 'Search query cannot exceed 100 characters.')
      .optional(),
    validity: z
      .enum(['active', 'expired', 'all'], {
        errorMap: () => ({ message: 'Validity filter must be "active", "expired", or "all".' }),
      })
      .default('all'),
    page: z.coerce
      .number()
      .int()
      .min(1, 'Page must be a positive integer.')
      .default(1),
    page_size: z.coerce
      .number()
      .int()
      .min(1, 'Page size must be at least 1.')
      .max(100, 'Page size cannot exceed 100.')
      .default(25),
  })
  .strict();

/**
 * Validation schema for manually issuing a warranty to a customer for a product (Admin only).
 */
export const manualWarrantySchema = z
  .object({
    productId: id,
    customerId: id,
    startDate: z.iso.date('Start date must be in YYYY-MM-DD format.').optional(),
    warrantyMonths: z
      .number({
        invalid_type_error: 'Warranty months must be a number.',
      })
      .int('Warranty months must be an integer.')
      .min(1, 'Warranty duration must be at least 1 month.')
      .max(120, 'Warranty duration cannot exceed 120 months (10 years).')
      .optional(),
  })
  .strict();

/**
 * Validation schema for attaching a customer to an anonymous walk-in sale warranty.
 */
export const attachCustomerSchema = z
  .object({
    customerId: id,
  })
  .strict();
