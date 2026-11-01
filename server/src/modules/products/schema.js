import { z } from 'zod';

/**
 * Validation schema for monetary currency amounts (e.g. cost price, selling price).
 * Accepts formatted strings like "12.50" or finite non-negative numbers with up to 2 decimal places.
 * Transforms all inputs into standard string representations.
 */
const moneySchema = z.union([
  z
    .string()
    .trim()
    .regex(
      /^\d{1,10}(?:\.\d{1,2})?$/,
      'Enter a non-negative amount with up to two decimal places.'
    ),
  z
    .number()
    .finite('Amount must be a finite number.')
    .nonnegative('Amount must be non-negative.')
    .refine(
      (value) => {
        const stringValue = String(value);
        const matchesPattern = /^\d{1,10}(?:\.\d{1,2})?$/.test(stringValue);
        return matchesPattern;
      },
      'Enter a non-negative amount with up to two decimal places.'
    )
    .transform((value) => String(value)),
]);

/**
 * Validation schema for category foreign key IDs.
 * Accepts numeric strings or positive integers, converting both to String.
 */
const categoryIdSchema = z
  .union([
    z.string().regex(/^\d+$/, 'Category ID must be numeric.'),
    z.number().int().positive('Category ID must be a positive integer.'),
  ])
  .transform(String);

/**
 * Common schema validator for non-negative stock counts and inventory thresholds.
 */
const nonNegativeQuantity = z
  .number({
    invalid_type_error: 'Quantity must be a number.',
  })
  .int('Quantity must be an integer.')
  .min(0, 'Quantity cannot be negative.')
  .max(1_000_000, 'Quantity cannot exceed 1,000,000.');

/**
 * Validation schema for creating a new product catalog item.
 */
export const productCreateSchema = z
  .object({
    sku: z
      .string({
        required_error: 'SKU is required.',
      })
      .trim()
      .min(1, 'SKU cannot be empty.')
      .max(50, 'SKU may not exceed 50 characters.'),
    name: z
      .string({
        required_error: 'Product name is required.',
      })
      .trim()
      .min(1, 'Product name cannot be empty.')
      .max(200, 'Product name may not exceed 200 characters.'),
    categoryId: categoryIdSchema,
    unit: z
      .string()
      .trim()
      .min(1, 'Unit cannot be empty.')
      .max(20, 'Unit may not exceed 20 characters.')
      .optional(),
    costPrice: moneySchema.optional(),
    sellingPrice: moneySchema,
    openingStock: nonNegativeQuantity.optional(),
    reorderLevel: nonNegativeQuantity.optional(),
    warrantyMonths: z
      .number()
      .int('Warranty months must be an integer.')
      .min(0, 'Warranty months cannot be negative.')
      .max(120, 'Warranty months cannot exceed 120 (10 years).')
      .optional(),
    tracksSerial: z
      .boolean({
        invalid_type_error: 'tracksSerial must be a boolean.',
      })
      .optional(),
  })
  .strict();

/**
 * Validation schema for updating existing product information.
 * Enforces that at least one actual product field is provided (confirmDeactivate alone does not count).
 */
export const productUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Product name cannot be empty.')
      .max(200, 'Product name may not exceed 200 characters.')
      .optional(),
    categoryId: categoryIdSchema.optional(),
    unit: z
      .string()
      .trim()
      .min(1, 'Unit cannot be empty.')
      .max(20, 'Unit may not exceed 20 characters.')
      .optional(),
    costPrice: moneySchema.optional(),
    sellingPrice: moneySchema.optional(),
    reorderLevel: nonNegativeQuantity.optional(),
    warrantyMonths: z
      .number()
      .int('Warranty months must be an integer.')
      .min(0, 'Warranty months cannot be negative.')
      .max(120, 'Warranty months cannot exceed 120.')
      .optional(),
    tracksSerial: z
      .boolean({
        invalid_type_error: 'tracksSerial must be a boolean.',
      })
      .optional(),
    status: z
      .enum(['active', 'inactive'], {
        errorMap: () => ({ message: 'Status must be "active" or "inactive".' }),
      })
      .optional(),
    confirmDeactivate: z
      .boolean({
        invalid_type_error: 'confirmDeactivate must be a boolean.',
      })
      .optional(),
  })
  .strict()
  .refine(
    (body) => {
      const keys = Object.keys(body);
      const hasProductFields = keys.some((key) => key !== 'confirmDeactivate');
      return hasProductFields;
    },
    {
      message: 'Provide at least one field to update.',
    }
  );

/**
 * Validation schema for querying, searching, filtering, and sorting product catalog listings.
 */
export const productListQuerySchema = z
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
    status: z
      .enum(['active', 'inactive', 'all'], {
        errorMap: () => ({ message: 'Status filter must be "active", "inactive", or "all".' }),
      })
      .optional(),
    low_stock: z
      .enum(['true', 'false'], {
        errorMap: () => ({ message: 'low_stock must be "true" or "false".' }),
      })
      .optional(),
    min_stock: z.coerce
      .number()
      .int('Minimum stock must be an integer.')
      .min(0, 'Minimum stock cannot be negative.')
      .optional(),
    max_stock: z.coerce
      .number()
      .int('Maximum stock must be an integer.')
      .min(0, 'Maximum stock cannot be negative.')
      .optional(),
    min_price: moneySchema.optional(),
    max_price: moneySchema.optional(),
    sort: z
      .enum(['name', 'sku', 'stock'], {
        errorMap: () => ({ message: 'Sort field must be "name", "sku", or "stock".' }),
      })
      .default('name'),
    direction: z
      .enum(['asc', 'desc'], {
        errorMap: () => ({ message: 'Direction must be "asc" or "desc".' }),
      })
      .default('asc'),
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
    (filters) => {
      const hasMin = filters.min_stock !== undefined;
      const hasMax = filters.max_stock !== undefined;
      if (hasMin && hasMax) {
        return filters.min_stock <= filters.max_stock;
      }
      return true;
    },
    {
      path: ['max_stock'],
      message: 'Maximum stock must not be below minimum stock.',
    }
  )
  .refine(
    (filters) => {
      const hasMin = filters.min_price !== undefined;
      const hasMax = filters.max_price !== undefined;
      if (hasMin && hasMax) {
        return Number(filters.min_price) <= Number(filters.max_price);
      }
      return true;
    },
    {
      path: ['max_price'],
      message: 'Maximum price must not be below minimum price.',
    }
  );

/**
 * Validation schema for Point of Sale (POS) ranked fast lookup queries.
 */
export const productLookupQuerySchema = z
  .object({
    q: z
      .string({
        required_error: 'Query parameter q is required.',
      })
      .trim()
      .min(1, 'Search query cannot be empty.')
      .max(100, 'Search query cannot exceed 100 characters.'),
  })
  .strict();
