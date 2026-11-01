import { HttpError } from '../../utils/http-error.js';
import {
  adjustStock,
  listInventory,
  listMovements,
  listProductMovements,
  stockIn,
} from './service.js';
import { inventoryListQuerySchema, movementQuerySchema } from './schema.js';

/**
 * Validates and transforms URL query string parameters using a specified Zod schema.
 * Formats validation failures into standard MicroLedger 422 HTTP errors.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against.
 * @param {Object} query - Express request query object.
 * @returns {Object} Validated and coerced query parameters.
 * @throws {HttpError} 422 if validation constraints fail.
 */
function parseQuery(schema, query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    const errorIssues = result.error.issues.map((issue) => {
      const fieldPath = issue.path.join('.');
      return {
        field: fieldPath,
        message: issue.message,
      };
    });

    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Check the submitted filters.',
      errorIssues
    );
  }

  return result.data;
}

/**
 * Handles HTTP GET /api/v1/inventory requests.
 * Retrieves paginated product stock balances and aggregate summary metrics.
 *
 * @param {import('express').Request} req - Express request with filters in query.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response containing inventory items.
 */
export async function listInventoryController(req, res) {
  const actor = req.user;
  const parsedFilters = parseQuery(inventoryListQuerySchema, req.query);

  const inventoryData = await listInventory(actor, parsedFilters);
  return res.json(inventoryData);
}

/**
 * Handles HTTP GET /api/v1/inventory/movements requests.
 * Retrieves paginated inventory stock ledger movements across all products.
 *
 * @param {import('express').Request} req - Express request with movement filters in query.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response containing stock movements.
 */
export async function listMovementsController(req, res) {
  const parsedFilters = parseQuery(movementQuerySchema, req.query);

  const movementsData = await listMovements(parsedFilters);
  return res.json(movementsData);
}

/**
 * Handles HTTP GET /api/v1/products/:id/movements requests.
 * Retrieves paginated stock movements recorded specifically for a single product.
 *
 * @param {import('express').Request} req - Express request with product ID in params.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response containing product movements.
 */
export async function listProductMovementsController(req, res) {
  const productId = req.params.id;
  const parsedFilters = parseQuery(movementQuerySchema, req.query);

  const movementsData = await listProductMovements(productId, parsedFilters);
  return res.json(movementsData);
}

/**
 * Handles HTTP POST /api/v1/inventory/stock-in requests.
 * Receives incoming stock shipments and increases current product stock.
 *
 * @param {import('express').Request} req - Express request with stock-in payload.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} HTTP 201 response with movement summary.
 */
export async function stockInController(req, res) {
  const actor = req.user;
  const payload = req.body;

  const result = await stockIn(actor, payload);
  return res.status(201).json(result);
}

/**
 * Handles HTTP POST /api/v1/inventory/adjustments requests.
 * Admin-only endpoint for performing manual stock reconciliations and adjustments.
 *
 * @param {import('express').Request} req - Express request with adjustment payload.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with updated stock and delta.
 */
export async function adjustmentController(req, res) {
  const actor = req.user;
  const payload = req.body;

  const result = await adjustStock(actor, payload);
  return res.json(result);
}
