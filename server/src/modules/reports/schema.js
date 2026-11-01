import { z } from 'zod';

/**
 * Common date range validator ensuring that start timestamps/dates do not succeed end timestamps/dates.
 *
 * @param {Object} query - The parsed query object with date filter fields.
 * @returns {boolean} True if the date boundaries are chronologically valid.
 */
function validateDateOrdering(query) {
  // Validate ISO datetime strings (with offset)
  if (query.from && query.to) {
    const fromTime = new Date(query.from).getTime();
    const toTime = new Date(query.to).getTime();
    if (fromTime > toTime) {
      return false;
    }
  }

  // Validate ISO calendar date strings (YYYY-MM-DD)
  if (query.from_date && query.to_date) {
    if (query.from_date > query.to_date) {
      return false;
    }
  }

  return true;
}

/**
 * Shared filter fields supported across various reporting endpoints.
 */
const baseReportFilters = {
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  from_date: z.iso.date().optional(),
  to_date: z.iso.date().optional(),
  user_id: z.string().regex(/^\d+$/, 'User ID must be numeric.').optional(),
  category_id: z.string().regex(/^\d+$/, 'Category ID must be numeric.').optional(),
  product_id: z.string().regex(/^\d+$/, 'Product ID must be numeric.').optional(),
  payment_method: z
    .enum(['cash', 'card', 'bank_transfer', 'other'], {
      errorMap: () => ({ message: 'Payment method must be cash, card, bank_transfer, or other.' }),
    })
    .optional(),
};

/**
 * Validation schema for the analytical sales report.
 * Supports grouping aggregations by day, product, category, cashier user, or payment method.
 */
export const salesReportSchema = z
  .object({
    ...baseReportFilters,
    group: z
      .enum(['day', 'product', 'category', 'user', 'payment'], {
        errorMap: () => ({ message: 'Group must be day, product, category, user, or payment.' }),
      })
      .default('day'),
  })
  .strict()
  .refine(validateDateOrdering, {
    path: ['to_date'],
    message: 'End date must not be before start date.',
  });

/**
 * Validation schema for the detailed inventory report.
 * Enforces category and product scope filters as well as date bounds for movements.
 */
export const inventoryReportSchema = z
  .object({
    from: baseReportFilters.from,
    to: baseReportFilters.to,
    from_date: baseReportFilters.from_date,
    to_date: baseReportFilters.to_date,
    category_id: baseReportFilters.category_id,
    product_id: baseReportFilters.product_id,
  })
  .strict()
  .refine(validateDateOrdering, {
    path: ['to_date'],
    message: 'End date must not be before start date.',
  });
