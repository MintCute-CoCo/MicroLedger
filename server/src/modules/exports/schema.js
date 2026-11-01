import { z } from 'zod';

/**
 * Exports Module Validation Schemas
 *
 * Purpose:
 * Validates query parameters used for data exports (CSV and XLSX formats),
 * enforcing parameter types, format selections, date boundaries, and numeric ranges.
 */

/**
 * Validation schema for exporting datasets and reports.
 *
 * Query Parameters:
 * - format: Output format ('xlsx' or 'csv'), defaults to 'xlsx'.
 * - from: ISO 8601 datetime string with timezone offset (start range).
 * - to: ISO 8601 datetime string with timezone offset (end range).
 * - from_date: ISO 8601 date string (YYYY-MM-DD) for store-local start range.
 * - to_date: ISO 8601 date string (YYYY-MM-DD) for store-local end range.
 * - q: Keyword to search within records.
 * - status: Entity or claim lifecycle status filter.
 * - category_id: Category primary key ID.
 * - low_stock: Flag for products at or below reorder level ('true' or 'false').
 * - payment_method: Sale payment method.
 * - user_id: User/operator ID.
 * - customer_id: Customer ID.
 * - group: Report grouping interval or field.
 * - product_id: Product ID.
 * - min_stock / max_stock: Integer inventory thresholds.
 * - min_price / max_price: Price range boundaries (decimal string).
 * - min_total / max_total: Sale total range boundaries (decimal string).
 * - supplier_id: Supplier ID.
 * - overdue: Overdue claim filter flag.
 * - phone: Customer phone search keyword.
 */
export const exportQuerySchema = z
  .object({
    // Target file format: Excel (xlsx) or Comma-Separated Values (csv)
    format: z
      .enum(['xlsx', 'csv'])
      .default('xlsx'),

    // ISO 8601 timestamp range filters (with timezone offset)
    from: z.iso
      .datetime({ offset: true })
      .optional(),

    to: z.iso
      .datetime({ offset: true })
      .optional(),

    // ISO 8601 calendar date range filters (YYYY-MM-DD)
    from_date: z.iso
      .date()
      .optional(),

    to_date: z.iso
      .date()
      .optional(),

    // General search text (item name, SKU, customer name, sale number, etc.)
    q: z
      .string()
      .trim()
      .max(100, 'Search keyword must not exceed 100 characters')
      .optional(),

    // Status filter covering products, sales, and claims
    status: z
      .enum([
        'active',
        'inactive',
        'all',
        'completed',
        'voided',
        'Submitted',
        'With Supplier',
        'Returned',
        'Ready for Customer',
        'Rejected',
        'Cancelled',
      ])
      .optional(),

    // Relational entity ID filters (digits only)
    category_id: z
      .string()
      .regex(/^\d+$/, 'Category ID must be a numeric string')
      .optional(),

    user_id: z
      .string()
      .regex(/^\d+$/, 'User ID must be a numeric string')
      .optional(),

    customer_id: z
      .string()
      .regex(/^\d+$/, 'Customer ID must be a numeric string')
      .optional(),

    product_id: z
      .string()
      .regex(/^\d+$/, 'Product ID must be a numeric string')
      .optional(),

    supplier_id: z
      .string()
      .regex(/^\d+$/, 'Supplier ID must be a numeric string')
      .optional(),

    // Boolean flags passed as query strings
    low_stock: z
      .enum(['true', 'false'])
      .optional(),

    overdue: z
      .enum(['true', 'false'])
      .optional(),

    // Payment and report grouping filters
    payment_method: z
      .enum(['cash', 'card', 'bank_transfer', 'other'])
      .optional(),

    group: z
      .enum(['day', 'product', 'category', 'user', 'payment'])
      .optional(),

    // Stock quantity range filters
    min_stock: z.coerce
      .number()
      .int('Minimum stock must be an integer')
      .min(0, 'Minimum stock must be non-negative')
      .optional(),

    max_stock: z.coerce
      .number()
      .int('Maximum stock must be an integer')
      .min(0, 'Maximum stock must be non-negative')
      .optional(),

    // Currency amount filters matching decimal format up to 2 decimal places
    min_price: z
      .string()
      .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Enter a valid decimal price')
      .optional(),

    max_price: z
      .string()
      .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Enter a valid decimal price')
      .optional(),

    min_total: z
      .string()
      .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Enter a valid decimal total')
      .optional(),

    max_total: z
      .string()
      .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Enter a valid decimal total')
      .optional(),

    // Contact phone search keyword
    phone: z
      .string()
      .trim()
      .max(30, 'Phone search must not exceed 30 characters')
      .optional(),
  })
  .strict()
  .refine(
    (values) => {
      // Validate that 'to' timestamp is on or after 'from' timestamp
      if (values.from && values.to) {
        const fromDate = new Date(values.from);
        const toDate = new Date(values.to);
        const isChronological = fromDate <= toDate;
        return isChronological;
      }
      return true;
    },
    {
      path: ['to'],
      message: 'End must be after start.',
    }
  )
  .refine(
    (values) => {
      // Validate that 'to_date' calendar date is on or after 'from_date'
      if (values.from_date && values.to_date) {
        const isChronological = values.from_date <= values.to_date;
        return isChronological;
      }
      return true;
    },
    {
      path: ['to_date'],
      message: 'End date must not be before start date.',
    }
  )
  .refine(
    (values) => {
      // Validate stock range consistency
      if (values.min_stock !== undefined && values.max_stock !== undefined) {
        const isRangeValid = values.min_stock <= values.max_stock;
        return isRangeValid;
      }
      return true;
    },
    {
      path: ['max_stock'],
      message: 'Maximum stock must not be below minimum stock.',
    }
  )
  .refine(
    (values) => {
      // Validate price range consistency
      if (values.min_price && values.max_price) {
        const minVal = Number(values.min_price);
        const maxVal = Number(values.max_price);
        const isRangeValid = minVal <= maxVal;
        return isRangeValid;
      }
      return true;
    },
    {
      path: ['max_price'],
      message: 'Maximum price must not be below minimum price.',
    }
  )
  .refine(
    (values) => {
      // Validate sale total range consistency
      if (values.min_total && values.max_total) {
        const minVal = Number(values.min_total);
        const maxVal = Number(values.max_total);
        const isRangeValid = minVal <= maxVal;
        return isRangeValid;
      }
      return true;
    },
    {
      path: ['max_total'],
      message: 'Maximum total must not be below minimum total.',
    }
  );
