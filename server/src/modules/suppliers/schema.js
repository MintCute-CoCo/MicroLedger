import { z } from 'zod';

/**
 * Shared field definitions for supplier creation and updates.
 */
const supplierFields = {
  name: z
    .string({
      required_error: 'Supplier name is required.',
    })
    .trim()
    .min(1, 'Supplier name cannot be empty.')
    .max(150, 'Supplier name may not exceed 150 characters.'),
  contact_person: z
    .string()
    .trim()
    .max(100, 'Contact person may not exceed 100 characters.')
    .nullable()
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone may not exceed 30 characters.')
    .nullable()
    .optional(),
  email: z
    .union([
      z.string().trim().email('Invalid email address.').max(254, 'Email may not exceed 254 characters.'),
      z.literal(''),
      z.null(),
    ])
    .optional(),
  notes: z
    .string()
    .max(5000, 'Notes may not exceed 5,000 characters.')
    .nullable()
    .optional(),
};

/**
 * Validation schema for creating a new supplier record.
 */
export const supplierCreateSchema = z
  .object(supplierFields)
  .strict();

/**
 * Validation schema for updating an existing supplier record.
 * Requires at least one attribute change beyond confirmDeactivate.
 */
export const supplierUpdateSchema = z
  .object({
    name: supplierFields.name.optional(),
    contact_person: supplierFields.contact_person,
    phone: supplierFields.phone,
    email: supplierFields.email,
    notes: supplierFields.notes,
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
    (values) => {
      const keys = Object.keys(values);
      const hasChanges = keys.some((key) => key !== 'confirmDeactivate');
      return hasChanges;
    },
    {
      message: 'Provide at least one change.',
    }
  );
