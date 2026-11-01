import { HttpError } from '../../utils/http-error.js';
import {
  completeSale,
  getSale,
  listSales,
  listSalesFilterUsers,
  voidSale,
} from './service.js';
import { saleListQuerySchema } from './schema.js';

/**
 * Middleware validating that req.params.id is a positive integer identifier.
 * Rejects non-numeric or non-positive IDs with a 404 SALE_NOT_FOUND error.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} _res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 */
function parseId(req, _res, next) {
  const idParam = req.params.id;
  const isNumeric = /^\d+$/.test(idParam);
  const isPositive = isNumeric && BigInt(idParam) >= 1n;

  if (!isPositive) {
    return next(new HttpError(404, 'SALE_NOT_FOUND', 'Sale not found.'));
  }

  return next();
}

/**
 * Validates and transforms request query parameters using the sales list schema.
 * Formats any validation failures into standard MicroLedger 422 HTTP responses.
 *
 * @param {Object} query - Express request query object.
 * @returns {Object} Validated query values.
 * @throws {HttpError} 422 if validation constraints fail.
 */
function parseListQuery(query) {
  const result = saleListQuerySchema.safeParse(query);

  if (!result.success) {
    const errorIssues = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

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
 * Handles HTTP GET /api/v1/sales requests.
 * Retrieves a paginated list of sales history matching filter criteria.
 *
 * @param {import('express').Request} req - Express request with query filters.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with sales and pagination metadata.
 */
export async function listSalesController(req, res) {
  const parsedFilters = parseListQuery(req.query);
  const salesData = await listSales(parsedFilters);
  return res.json(salesData);
}

/**
 * Handles HTTP GET /api/v1/sales/filter-users requests.
 * Retrieves distinct staff users who have created sales transactions, for filtering dropdowns.
 *
 * @param {import('express').Request} _req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with array of staff users.
 */
export async function listSalesFilterUsersController(_req, res) {
  const users = await listSalesFilterUsers();
  return res.json({ items: users });
}

/**
 * Handles HTTP GET /api/v1/sales/:id requests.
 * Retrieves full details and line item snapshots for a single sale.
 *
 * @param {import('express').Request} req - Express request with sale ID in params.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with sale details.
 */
export async function getSaleController(req, res) {
  const saleId = req.params.id;
  const saleDetails = await getSale(saleId);
  return res.json(saleDetails);
}

/**
 * Handles HTTP POST /api/v1/sales requests.
 * Completes a checkout sale at Point of Sale (POS) atomically.
 *
 * @param {import('express').Request} req - Express request with checkout body and Idempotency-Key header.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} HTTP 201 response with completed sale details.
 */
export async function completeSaleController(req, res) {
  const actor = req.user;
  const checkoutPayload = req.body;
  const idempotencyKey = req.get('Idempotency-Key');

  const completedSale = await completeSale(actor, checkoutPayload, idempotencyKey);
  return res.status(201).json(completedSale);
}

/**
 * Handles HTTP POST /api/v1/sales/:id/void requests.
 * Voids a previously completed sale and reverses stock deduction (Admin only).
 *
 * @param {import('express').Request} req - Express request with sale ID in params and void reason in body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with voided sale details.
 */
export async function voidSaleController(req, res) {
  const actor = req.user;
  const saleId = req.params.id;
  const voidReason = req.body.reason;

  const voidedSale = await voidSale(actor, saleId, voidReason);
  return res.json(voidedSale);
}

export { parseId as parseSaleId };
