import { z } from 'zod';

/**
 * Validation schema for audit log query parameters.
 *
 * Purpose:
 * Validates and sanitizes incoming HTTP query parameters for filtering and
 * paginating audit log entries. Enforces a strict schema to prevent unexpected
 * query parameters from being processed.
 *
 * Validated Query Parameters:
 * - user_id: (Optional) Positive integer string representing the user who performed the action.
 * - action: (Optional) Action identifier or substring, trimmed string up to 100 characters.
 * - entity_type: (Optional) Entity type name, trimmed string up to 50 characters.
 * - from: (Optional) ISO 8601 datetime string with timezone offset for the start of the date range.
 * - to: (Optional) ISO 8601 datetime string with timezone offset for the end of the date range.
 * - page: (Optional) Integer >= 1, defaults to 1. Coerced from query string.
 * - page_size: (Optional) Integer between 1 and 100, defaults to 25. Coerced from query string.
 */
export const auditQuerySchema = z
  .object({
    // Filter by the user ID who performed the action (must be a numeric string)
    user_id: z
      .string()
      .regex(/^\d+$/, 'User ID must be a numeric string')
      .optional(),

    // Filter by action name or keyword (e.g., 'sale.created', 'product.updated')
    action: z
      .string()
      .trim()
      .max(100, 'Action filter must not exceed 100 characters')
      .optional(),

    // Filter by the affected entity type (e.g., 'sale', 'customer', 'product')
    entity_type: z
      .string()
      .trim()
      .max(50, 'Entity type filter must not exceed 50 characters')
      .optional(),

    // Filter for logs created on or after this ISO datetime (with timezone offset)
    from: z.iso
      .datetime({ offset: true })
      .optional(),

    // Filter for logs created on or before this ISO datetime (with timezone offset)
    to: z.iso
      .datetime({ offset: true })
      .optional(),

    // Pagination: page number (coerced from query string, minimum 1, defaults to 1)
    page: z.coerce
      .number()
      .int('Page must be an integer')
      .min(1, 'Page number must be at least 1')
      .default(1),

    // Pagination: number of records per page (coerced from query string, 1-100, defaults to 25)
    page_size: z.coerce
      .number()
      .int('Page size must be an integer')
      .min(1, 'Page size must be at least 1')
      .max(100, 'Page size must not exceed 100')
      .default(25),
  })
  .strict();
