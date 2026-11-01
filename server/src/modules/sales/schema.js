import { z } from 'zod';

/**
 * Common schema validator for product primary key IDs.
 * Accepts numeric strings or positive integers, converting both to String.
 */
const productId = z
  .union([
    z.string().regex(/^\d+$/, 'Product ID must be numeric.'),
    z.number().int().positive('Product ID must be a positive integer.'),
  ])
  .transform(String);

/**
 * Common schema validator for monetary currency amounts (e.g. discounts, total ranges).
 * Accepts strings with up to 2 decimal places or finite non-negative numbers, converting both to String.
 */
const amount = z.union([
  z
    .string()
    .trim()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Enter a non-negative amount with up to 2 decimal places.'),
  z
    .number()
    .finite('Amount must be finite.')
    .nonnegative('Amount cannot be negative.')
    .refine(
      (value) => /^\d{1,10}(?:\.\d{1,2})?$/.test(String(value)),
      'Enter a non-negative amount with up to 2 decimal places.'
    )
    .transform(String),
]);

/**
 * Validation schema for completing a checkout sale at Point of Sale (POS).
 * Enforces line items validation, valid payment methods, optional discounts, and optional customer assignment.
 */
export const saleCreateSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId,
            quantity: z
              .number({
                required_error: 'Item quantity is required.',
              })
              .int('Quantity must be an integer.')
              .min(1, 'Quantity must be at least 1.')
              .max(2_147_483_647, 'Quantity is too large.'),
            serialNumbers: z
              .array(
                z
                  .string()
                  .trim()
                  .min(1, 'Serial number cannot be empty.')
                  .max(100, 'Serial number may not exceed 100 characters.')
              )
              .max(100, 'Cannot exceed 100 serial numbers per line.')
              .optional(),
          })
          .strict()
      )
      .min(1, 'A sale must contain at least one item.')
      .max(100, 'A sale may contain at most 100 item lines.'),
    paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'other'], {
      errorMap: () => ({ message: 'Payment method must be cash, card, bank_transfer, or other.' }),
    }),
    discountAmount: amount.optional(),
    customerId: productId.nullable().optional(),
  })
  .strict();

/**
 * Validation schema for querying, filtering, and paginating sales transaction records.
 */
export const saleListQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, 'Search query cannot exceed 100 characters.')
      .optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    from_date: z.iso.date().optional(),
    to_date: z.iso.date().optional(),
    user_id: z.string().regex(/^\d+$/, 'User ID must be numeric.').optional(),
    customer_id: z.string().regex(/^\d+$/, 'Customer ID must be numeric.').optional(),
    payment_method: z
      .enum(['cash', 'card', 'bank_transfer', 'other'], {
        errorMap: () => ({ message: 'Invalid payment method filter.' }),
      })
      .optional(),
    min_total: amount.optional(),
    max_total: amount.optional(),
    status: z
      .enum(['completed', 'voided', 'all'], {
        errorMap: () => ({ message: 'Status must be completed, voided, or all.' }),
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
  .strict()
  .refine(
    (query) => {
      if (!query.from || !query.to) {
        return true;
      }
      return new Date(query.from).getTime() <= new Date(query.to).getTime();
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
  )
  .refine(
    (query) => {
      const hasMin = query.min_total !== undefined;
      const hasMax = query.max_total !== undefined;
      if (hasMin && hasMax) {
        return Number(query.min_total) <= Number(query.max_total);
      }
      return true;
    },
    {
      path: ['max_total'],
      message: 'Maximum sale total must not be below minimum total.',
    }
  );

/**
 * Validation schema for voiding an existing sale transaction.
 * Requires a mandatory non-empty audit reason.
 */
export const voidSaleSchema = z
  .object({
    reason: z
      .string({
        required_error: 'Reason is required to void a sale.',
      })
      .trim()
      .min(1, 'Reason cannot be empty.')
      .max(255, 'Reason may not exceed 255 characters.'),
  })
  .strict();
