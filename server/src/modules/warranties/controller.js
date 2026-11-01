import { HttpError } from '../../utils/http-error.js';
import {
  attachCustomerSchema,
  manualWarrantySchema,
  warrantyListSchema,
} from './schema.js';
import {
  attachWarrantyCustomer,
  createManualWarranty,
  listWarranties,
} from './service.js';

/**
 * Warranties Controller Layer
 *
 * Handles HTTP requests, parameter extraction, schema validation,
 * and JSON response formatting for warranty endpoints.
 * Strictly adheres to the project architecture rule: "Controllers do HTTP only."
 */

/**
 * Validates request input payload against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - Zod validation schema.
 * @param {any} value - Input payload to validate.
 * @returns {any} Sanitized and typed data.
 * @throws {HttpError} 422 VALIDATION_FAILED if input is invalid.
 */
function parse(schema, value) {
  const result = schema.safeParse(value);

  if (!result.success) {
    const errorDetails = result.error.issues;
    throw new HttpError(422, 'VALIDATION_FAILED', 'Check the warranty fields.', errorDetails);
  }

  return result.data;
}

/**
 * Validates and extracts a numeric warranty ID from route parameters.
 *
 * @param {import('express').Request} req - Express request object.
 * @returns {string} Clean numeric warranty ID string.
 * @throws {HttpError} 404 WARRANTY_NOT_FOUND if ID is non-numeric or less than 1.
 */
function parseId(req) {
  const rawId = req.params.id;
  const isNumeric = /^\d+$/.test(rawId);

  if (!isNumeric || BigInt(rawId) < 1n) {
    throw new HttpError(404, 'WARRANTY_NOT_FOUND', 'Warranty not found.');
  }

  return rawId;
}

/**
 * Handles HTTP GET /warranties
 * Retrieves a paginated list of warranty records with optional search and validity filters.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response with paginated warranty items.
 */
export async function listWarrantiesController(req, res) {
  const validatedQuery = parse(warrantyListSchema, req.query);
  const warrantiesList = await listWarranties(validatedQuery);
  return res.json(warrantiesList);
}

/**
 * Handles HTTP POST /warranties/manual
 * Creates a warranty record manually for a product and customer (Admin only).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response with HTTP 201 and created warranty.
 */
export async function createManualWarrantyController(req, res) {
  const validatedBody = parse(manualWarrantySchema, req.body);
  const currentUser = req.user;
  const createdRecord = await createManualWarranty(currentUser, validatedBody);
  return res.status(201).json(createdRecord);
}

/**
 * Handles HTTP PATCH /warranties/:id/customer
 * Attaches a customer ID to an unassigned warranty.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response with updated warranty.
 */
export async function attachWarrantyCustomerController(req, res) {
  const warrantyId = parseId(req);
  const validatedBody = parse(attachCustomerSchema, req.body);
  const customerId = validatedBody.customerId;
  const currentUser = req.user;

  const result = await attachWarrantyCustomer(currentUser, warrantyId, customerId);
  return res.json(result);
}
