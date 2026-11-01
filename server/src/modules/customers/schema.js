import { z } from 'zod';

/**
 * Customers Module Validation Schemas
 *
 * Purpose:
 * Defines strict Zod schemas for validating incoming requests to the customers module:
 * - Query filters for searching and paginating customers
 * - Payload for creating a new customer record
 * - Payload for updating an existing customer record
 */

// Customer full name: trimmed non-empty string bounded by database VARCHAR(100) limit
const nameSchema = z
  .string()
  .trim()
  .min(1, 'Customer name is required')
  .max(100, 'Customer name must not exceed 100 characters');

// Customer phone number: trimmed string normalized to null when empty,
// validated to ensure 5-30 digits/punctuation characters with at least one digit
const phoneSchema = z
  .string()
  .trim()
  .transform((value) => {
    const normalizedValue = value || null;
    return normalizedValue;
  })
  .refine(
    (value) => {
      // Optional phone number can be null
      if (value === null) {
        return true;
      }

      // Check character length boundary
      const isLengthValid = value.length >= 5 && value.length <= 30;
      if (!isLengthValid) {
        return false;
      }

      // Check allowed telephone punctuation and numbers
      const allowedCharactersRegex = /^[0-9+() -]+$/;
      const hasAllowedCharacters = allowedCharactersRegex.test(value);
      if (!hasAllowedCharacters) {
        return false;
      }

      // Check that at least one numeric digit exists
      const containsDigitRegex = /\d/;
      const hasAtLeastOneDigit = containsDigitRegex.test(value);
      return hasAtLeastOneDigit;
    },
    'Enter a phone with 5–30 digits or phone punctuation.'
  );

/**
 * Validation schema for creating a new customer.
 *
 * Fields:
 * - name: Required customer name (1 to 100 characters).
 * - phone: Optional phone number (5 to 30 valid telephone characters).
 */
export const customerCreateSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema.optional(),
  })
  .strict();

/**
 * Validation schema for updating an existing customer.
 *
 * Fields:
 * - name: (Optional) New customer name.
 * - phone: (Optional) New phone number.
 *
 * Rules:
 * - At least one updatable field must be provided in the request body.
 */
export const customerUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .strict()
  .refine(
    (body) => {
      const providedKeys = Object.keys(body);
      const hasFieldsToUpdate = providedKeys.length > 0;
      return hasFieldsToUpdate;
    },
    'Provide at least one field to update.'
  );

/**
 * Validation schema for customer search and pagination query parameters.
 *
 * Query Parameters:
 * - q: (Optional) Search query matching customer name or phone substring.
 * - page: (Optional) Page number (minimum 1, defaults to 1).
 * - page_size: (Optional) Page size (between 1 and 100, defaults to 25).
 */
export const customerListQuerySchema = z
  .object({
    // Search query string (case-insensitive substring match)
    q: z
      .string()
      .trim()
      .max(100, 'Search query must not exceed 100 characters')
      .optional(),

    // Pagination: page number (minimum 1, defaults to 1)
    page: z.coerce
      .number()
      .int('Page must be an integer')
      .min(1, 'Page number must be at least 1')
      .default(1),

    // Pagination: number of records per page (1-100, defaults to 25)
    page_size: z.coerce
      .number()
      .int('Page size must be an integer')
      .min(1, 'Page size must be at least 1')
      .max(100, 'Page size must not exceed 100')
      .default(25),
  })
  .strict();
