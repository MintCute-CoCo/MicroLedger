import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import {
  adjustmentController,
  listInventoryController,
  listMovementsController,
  stockInController,
} from './controller.js';
import { adjustmentSchema, stockInSchema } from './schema.js';

const router = Router();

/**
 * Higher-order middleware factory that validates request body payloads against a Zod schema.
 * Formats validation failures into standard MicroLedger 422 HTTP responses.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to enforce on req.body.
 * @returns {import('express').RequestHandler} Express request handler middleware.
 */
function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errorIssues = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(
        new HttpError(422, 'VALIDATION_FAILED', 'Check the submitted fields.', errorIssues)
      );
    }

    req.body = result.data;
    return next();
  };
}

/**
 * All inventory routes require an active authenticated user session.
 */
router.use(authenticate);

/**
 * Route: GET /api/v1/inventory
 * Retrieves current stock levels, low-stock flags, and valuation data (Admin only).
 */
router.get('/', listInventoryController);

/**
 * Route: GET /api/v1/inventory/movements
 * Retrieves paginated audit ledger movements across all catalog products.
 */
router.get('/movements', listMovementsController);

/**
 * Route: POST /api/v1/inventory/stock-in
 * Receives incoming stock shipments into warehouse inventory.
 */
router.post('/stock-in', validate(stockInSchema), stockInController);

/**
 * Route: POST /api/v1/inventory/adjustments
 * Reconciles stock discrepancies manually (restricted to Admin role).
 */
router.post(
  '/adjustments',
  requireRole('admin'),
  validate(adjustmentSchema),
  adjustmentController
);

export default router;
