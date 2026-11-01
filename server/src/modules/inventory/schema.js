import { z } from 'zod';

/**
 * Common schema validator for product primary key IDs.
 * Accepts either a numeric string or positive integer, converting both to String.
 */
const productId = z
  .union([
    z.string().regex(/^\d+$/, 'Product ID must be a numeric string.'),
    z.number().int().positive('Product ID must be a positive integer.'),
  ])
  .transform(String);

/**
 * Validation schema for receiving incoming inventory stock.
 * Requires a positive integer quantity between 1 and 1,000,000.
 */
export const stockInSchema = z
  .object({
    productId,
    quantity: z
      .number({
        required_error: 'Quantity is required.',
        invalid_type_error: 'Quantity must be a number.',
      })
      .int('Quantity must be an integer.')
      .min(1, 'Quantity must be at least 1.')
      .max(1_000_000, 'Quantity cannot exceed 1,000,000.'),
    note: z
      .string()
      .trim()
      .max(255, 'Note may not exceed 255 characters.')
      .optional(),
  })
  .strict();

/**
 * Validation schema for manual inventory stock adjustments.
 * Requires either a delta adjustment (quantityChange) or an absolute target (newQuantity),
 * along with a mandatory audit reason.
 */
export const adjustmentSchema = z
  .object({
    productId,
    quantityChange: z
      .number()
      .int('Quantity change must be an integer.')
      .min(-2_147_483_647, 'Quantity change is too low.')
      .max(2_147_483_647, 'Quantity change is too large.')
      .optional(),
    newQuantity: z
      .number()
      .int('New quantity must be an integer.')
      .min(0, 'New quantity cannot be negative.')
      .max(2_147_483_647, 'New quantity is too large.')
      .optional(),
    reason: z
      .string({
        required_error: 'Reason is required for inventory adjustment.',
      })
      .trim()
      .min(1, 'Reason cannot be empty.')
      .max(255, 'Reason may not exceed 255 characters.'),
  })
  .strict()
  .refine(
    (body) => {
      const hasChange = body.quantityChange !== undefined;
      const hasTarget = body.newQuantity !== undefined;
      const count = Number(hasChange) + Number(hasTarget);
      return count === 1;
    },
    {
      message: 'Provide either quantityChange or newQuantity.',
    }
  )
  .refine(
    (body) => body.quantityChange !== 0,
    {
      path: ['quantityChange'],
      message: 'The quantity change cannot be zero.',
    }
  );

/**
 * Validation schema for filtering and paginating current inventory balances.
 */
export const inventoryListQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, 'Search query cannot exceed 100 characters.')
      .optional(),
    category_id: z
      .string()
      .regex(/^\d+$/, 'Category ID must be numeric.')
      .optional(),
    low_stock: z
      .enum(['true', 'false'], {
        errorMap: () => ({ message: 'low_stock must be "true" or "false".' }),
      })
      .optional(),
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
 * Validation schema for querying stock movement transactions across the system or for a specific product.
 */
export const movementQuerySchema = z
  .object({
    type: z
      .enum(['opening', 'stock_in', 'adjustment', 'sale', 'void_reversal'], {
        errorMap: () => ({ message: 'Invalid movement type.' }),
      })
      .optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    from_date: z.iso.date().optional(),
    to_date: z.iso.date().optional(),
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
  .strict()
  .refine(
    (query) => {
      if (!query.from || !query.to) {
        return true;
      }
      const startTime = new Date(query.from).getTime();
      const endTime = new Date(query.to).getTime();
      return startTime <= endTime;
    },
    {
      path: ['to'],
      message: 'The end time must not be before the start time.',
    }
  )
  .refine(
    (query) => {
      if (!query.from_date || !query.to_date) {
        return true;
      }
      return query.from_date <= query.to_date;
    },
    {
      path: ['to_date'],
      message: 'The end date must not be before the start date.',
    }
  );
