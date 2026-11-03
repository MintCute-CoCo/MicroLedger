import { z } from 'zod';

/**
 * Validation schema for updating system-wide store settings.
 * Supports updating currency code, decimal precision, IANA store time zone,
 * and customizable store profile / receipt branding details.
 * Enforces that at least one setting property is provided in the request body.
 */
export const settingsSchema = z
  .object({
    currency_code: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/, 'Currency code must be a 3-letter ISO code (e.g. USD, EUR, VND).')
      .optional(),
    currency_decimals: z
      .number({
        invalid_type_error: 'Currency decimals must be a number.',
      })
      .int('Currency decimals must be an integer.')
      .min(0, 'Currency decimals cannot be negative.')
      .max(2, 'Currency decimals cannot exceed 2.')
      .optional(),
    time_zone: z
      .string()
      .trim()
      .min(1, 'Time zone cannot be empty.')
      .max(100, 'Time zone may not exceed 100 characters.')
      .optional(),
    store_name: z
      .string()
      .trim()
      .min(1, 'Store name cannot be empty.')
      .max(100, 'Store name cannot exceed 100 characters.')
      .optional(),
    store_tagline: z
      .string()
      .trim()
      .max(150, 'Store tagline cannot exceed 150 characters.')
      .optional(),
    store_address: z
      .string()
      .trim()
      .max(255, 'Store address cannot exceed 255 characters.')
      .optional(),
    store_phone: z
      .string()
      .trim()
      .max(50, 'Store phone cannot exceed 50 characters.')
      .optional(),
  })
  .strict()
  .refine(
    (value) => {
      const keys = Object.keys(value);
      return keys.length > 0;
    },
    {
      message: 'Provide at least one setting.',
    }
  );
