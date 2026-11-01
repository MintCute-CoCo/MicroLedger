import { z } from 'zod';

/**
 * Validation schema for committing an import batch.
 * Requires a mode specifying whether to enforce that all rows are valid,
 * or to commit valid rows and skip invalid rows.
 */
export const commitSchema = z
  .object({
    mode: z.enum(['all', 'valid_only'], {
      errorMap: () => ({ message: 'Mode must be either "all" or "valid_only".' }),
    }),
  })
  .strict();

/**
 * Validation schema for custom column mapping during file import.
 * Maps custom file column header names to standard product attribute keys.
 */
export const mappingSchema = z
  .record(z.string(), z.string())
  .optional();

/**
 * Validation schema for paginating import preview rows.
 * Page numbers start from 1, and page size is capped at 100 rows per request.
 */
export const previewPageSchema = z
  .object({
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
