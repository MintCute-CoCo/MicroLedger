import { z } from 'zod';

/**
 * Category Module Validation Schemas
 *
 * Purpose:
 * Defines strict Zod validation schemas for category-related HTTP requests,
 * ensuring filter queries, category creation, and category update payloads
 * conform to required formats and business rules.
 */

/**
 * Validation schema for category list query filters.
 *
 * Query Parameters:
 * - status: (Optional) Filter by category status ('active', 'inactive', or 'all').
 */
export const categoryListQuerySchema = z
  .object({
    status: z
      .enum(['active', 'inactive', 'all'])
      .optional(),
  })
  .strict();

/**
 * Validation schema for creating a new product category.
 *
 * Payload:
 * - name: Required string, trimmed, 1 to 100 characters.
 * - description: Optional string, trimmed, max 255 characters (nullable).
 */
export const categoryCreateSchema = z
  .object({
    // Name is required, trimmed, and bounded by DB column limit
    name: z
      .string()
      .trim()
      .min(1, 'Category name is required')
      .max(100, 'Category name must not exceed 100 characters'),

    // Description is optional, nullable, and capped at 255 characters
    description: z
      .string()
      .trim()
      .max(255, 'Description must not exceed 255 characters')
      .nullable()
      .optional(),
  })
  .strict();

/**
 * Validation schema for updating an existing product category.
 *
 * Payload:
 * - name: (Optional) New category name, 1 to 100 characters.
 * - description: (Optional) New description, max 255 characters (nullable).
 * - status: (Optional) New lifecycle status ('active' or 'inactive').
 *
 * Rules:
 * - At least one updatable field must be provided in the request body.
 */
export const categoryUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Category name must be at least 1 character long')
      .max(100, 'Category name must not exceed 100 characters')
      .optional(),

    description: z
      .string()
      .trim()
      .max(255, 'Description must not exceed 255 characters')
      .nullable()
      .optional(),

    status: z
      .enum(['active', 'inactive'])
      .optional(),
  })
  .strict()
  .refine(
    (body) => {
      // Ensure at least one property is being updated
      const providedKeys = Object.keys(body);
      const hasUpdates = providedKeys.length > 0;
      return hasUpdates;
    },
    'Provide at least one field to update.'
  );
