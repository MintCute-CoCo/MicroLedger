import { z } from 'zod';

/**
 * Claims Module Validation Schemas
 *
 * Purpose:
 * Defines strict Zod schemas for validating incoming requests to the warranty claims module:
 * - Query filters for listing and paginating claims
 * - Input payload for creating a new claim
 * - Transition payload for advancing claim status through its lifecycle
 */

// Reusable numeric ID schema: accepts digit string or positive integer, transforms to string
const idSchema = z
  .union([
    z.string().regex(/^\d+$/, 'ID must contain only digits'),
    z.number().int().positive('ID must be a positive integer'),
  ])
  .transform((val) => String(val));

// Standard ISO date string format (YYYY-MM-DD)
const dateSchema = z.iso.date();

/**
 * Validation schema for listing claims with search filters and pagination.
 */
export const claimListSchema = z
  .object({
    // Filter by specific claim lifecycle status
    status: z
      .enum([
        'Submitted',
        'With Supplier',
        'Returned',
        'Ready for Customer',
        'Completed',
        'Rejected',
        'Cancelled',
      ])
      .optional(),

    // Filter by supplier assigned to repair the item
    supplier_id: z
      .string()
      .regex(/^\d+$/, 'Supplier ID must be a numeric string')
      .optional(),

    // Filter to show only overdue claims currently with supplier
    overdue: z
      .enum(['true', 'false'])
      .default('false')
      .transform((val) => val === 'true'),

    // Search by customer contact phone substring
    phone: z
      .string()
      .trim()
      .max(30, 'Phone search must not exceed 30 characters')
      .optional(),

    // Start date filter (inclusive)
    from: dateSchema.optional(),

    // End date filter (inclusive)
    to: dateSchema.optional(),

    // Pagination: page number (minimum 1, defaults to 1)
    page: z.coerce
      .number()
      .int('Page must be an integer')
      .min(1, 'Page number must be at least 1')
      .default(1),

    // Pagination: page size (1 to 100, defaults to 25)
    page_size: z.coerce
      .number()
      .int('Page size must be an integer')
      .min(1, 'Page size must be at least 1')
      .max(100, 'Page size must not exceed 100')
      .default(25),
  })
  .strict()
  .refine(
    (filters) => {
      // If both from and to are provided, ensure from does not exceed to
      if (filters.from && filters.to) {
        const isChronological = filters.from <= filters.to;
        return isChronological;
      }
      return true;
    },
    {
      path: ['to'],
      message: 'End date must not be before start date.',
    }
  );

/**
 * Validation schema for submitting a new warranty claim.
 */
export const claimCreateSchema = z
  .object({
    // ID of the active or expired warranty being claimed
    warrantyId: idSchema,

    // Optional customer ID if not already attached to the warranty
    customerId: idSchema.optional(),

    // Optional claim date, defaults to current store date
    claimDate: dateSchema.optional(),

    // Required description of the issue/defect
    problem: z
      .string()
      .trim()
      .min(1, 'Problem description is required')
      .max(1000, 'Problem description must not exceed 1000 characters'),

    // Note required from Admin when claiming an expired warranty
    outOfWarrantyNote: z
      .string()
      .trim()
      .max(1000, 'Out of warranty note must not exceed 1000 characters')
      .optional(),

    // Additional general internal notes
    notes: z
      .string()
      .max(2000, 'Notes must not exceed 2000 characters')
      .optional(),
  })
  .strict();

/**
 * Validation schema for advancing a claim's status.
 */
export const claimTransitionSchema = z
  .object({
    // Target status to transition the claim into
    status: z.enum([
      'With Supplier',
      'Returned',
      'Ready for Customer',
      'Completed',
      'Rejected',
      'Cancelled',
    ]),

    // Associated metadata required by the specific transition
    data: z
      .object({
        // Supplier assigned for external repair
        supplierId: idSchema.optional(),

        // Date the unit was dispatched to the supplier
        sentDate: dateSchema.optional(),

        // Expected return date from the supplier
        expectedReturnDate: dateSchema.optional(),

        // Actual date the unit was received back from supplier
        actualReturnDate: dateSchema.optional(),

        // Date the repaired/replaced unit was collected by customer
        collectedDate: dateSchema.optional(),

        // Repair resolution outcome
        resolution: z
          .enum(['repaired', 'replaced', 'cannot_repair', 'other'])
          .optional(),

        // Reason required when rejecting or cancelling a claim
        reason: z
          .string()
          .trim()
          .max(255, 'Reason must not exceed 255 characters')
          .optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
