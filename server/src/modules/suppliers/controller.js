import { HttpError } from '../../utils/http-error.js';
import { supplierCreateSchema, supplierUpdateSchema } from './schema.js';
import {
  createSupplier,
  listSuppliers,
  updateSupplier,
} from './service.js';

/**
 * Validates request payloads against a specified Zod schema.
 * Formats validation failures into standard MicroLedger 422 HTTP responses.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against.
 * @param {Object} value - Payload object to validate.
 * @returns {Object} Validated payload values.
 * @throws {HttpError} 422 if validation constraints fail.
 */
function parse(schema, value) {
  const result = schema.safeParse(value);

  if (!result.success) {
    const errorIssues = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Check the supplier fields.',
      errorIssues
    );
  }

  return result.data;
}

/**
 * Extracts and validates that the supplier ID parameter is a positive integer.
 *
 * @param {import('express').Request} req - Express request.
 * @returns {string} Validated supplier ID string.
 * @throws {HttpError} 404 if the ID is missing, non-numeric, or non-positive.
 */
function parseSupplierId(req) {
  const idParam = req.params.id;
  const isNumeric = /^\d+$/.test(idParam);
  const isPositive = isNumeric && BigInt(idParam) >= 1n;

  if (!isPositive) {
    throw new HttpError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found.');
  }

  return idParam;
}

/**
 * Handles HTTP GET /api/v1/suppliers requests.
 * Retrieves all supplier records (filtered by status according to role).
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with suppliers array.
 */
export async function listSuppliersController(req, res) {
  const actor = req.user;
  const statusParam = req.query.status === 'all' ? 'all' : 'active';

  const suppliers = await listSuppliers(actor, statusParam);
  return res.json({ items: suppliers });
}

/**
 * Handles HTTP POST /api/v1/suppliers requests.
 * Creates a new supplier catalog entry (Admin only).
 *
 * @param {import('express').Request} req - Express request with supplier creation body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} HTTP 201 response with created supplier.
 */
export async function createSupplierController(req, res) {
  const actor = req.user;
  const payload = parse(supplierCreateSchema, req.body);

  const created = await createSupplier(actor, payload);
  return res.status(201).json(created);
}

/**
 * Handles HTTP PATCH /api/v1/suppliers/:id requests.
 * Updates an existing supplier record (Admin only).
 *
 * @param {import('express').Request} req - Express request with supplier ID in params and changes in body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with updated supplier.
 */
export async function updateSupplierController(req, res) {
  const actor = req.user;
  const supplierId = parseSupplierId(req);
  const payload = parse(supplierUpdateSchema, req.body);

  const updated = await updateSupplier(actor, supplierId, payload);
  return res.json(updated);
}
