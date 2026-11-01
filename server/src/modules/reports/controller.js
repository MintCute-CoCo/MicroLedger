import { HttpError } from '../../utils/http-error.js';
import {
  dashboard,
  inventoryReport,
  salesReport,
  warrantyReport,
} from './service.js';
import { inventoryReportSchema, salesReportSchema } from './schema.js';

/**
 * Validates report request query parameters using a specified Zod schema.
 * Formats any validation failures into standard MicroLedger 422 HTTP responses.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to enforce on query parameters.
 * @param {Object} query - Express request query object.
 * @returns {Object} Validated and coerced query values.
 * @throws {HttpError} 422 if validation constraints fail.
 */
function parse(schema, query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    const errorIssues = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Check the report filters.',
      errorIssues
    );
  }

  return result.data;
}

/**
 * Handles HTTP GET /api/v1/reports/dashboard requests.
 * Retrieves summarized operational metrics, trailing 7-day sales trends, top items,
 * and inventory balances.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with dashboard data.
 */
export async function dashboardController(req, res) {
  const actor = req.user;
  const dashboardData = await dashboard(actor);
  return res.json(dashboardData);
}

/**
 * Handles HTTP GET /api/v1/reports/sales requests.
 * Retrieves an analytical sales breakdown grouped by dimension alongside voided sales (Admin only).
 *
 * @param {import('express').Request} req - Express request with sales report filters in query.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with grouped sales report data.
 */
export async function salesReportController(req, res) {
  const parsedFilters = parse(salesReportSchema, req.query);
  const reportData = await salesReport(parsedFilters);
  return res.json(reportData);
}

/**
 * Handles HTTP GET /api/v1/reports/inventory requests.
 * Retrieves current product stock levels, movement audit trails, and inventory valuation (Admin only).
 *
 * @param {import('express').Request} req - Express request with inventory report filters in query.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with inventory report data.
 */
export async function inventoryReportController(req, res) {
  const actor = req.user;
  const parsedFilters = parse(inventoryReportSchema, req.query);

  const reportData = await inventoryReport(actor, parsedFilters);
  return res.json(reportData);
}

/**
 * Handles HTTP GET /api/v1/reports/warranty requests.
 * Retrieves warranty claim lifecycle status counts, supplier aggregations, and overdue return alerts.
 *
 * @param {import('express').Request} _req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with warranty report data.
 */
export async function warrantyReportController(_req, res) {
  const reportData = await warrantyReport();
  return res.json(reportData);
}
