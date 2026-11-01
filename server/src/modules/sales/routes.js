import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import {
  completeSaleController,
  getSaleController,
  listSalesController,
  listSalesFilterUsersController,
  parseSaleId,
  voidSaleController,
} from './controller.js';
import { saleCreateSchema, voidSaleSchema } from './schema.js';

const router = Router();

/**
 * Higher-order middleware factory that validates request body payloads against a Zod schema.
 * Formats any validation failures into standard MicroLedger 422 HTTP responses.
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
 * All sales endpoints require an active authenticated user session.
 */
router.use(authenticate);

/**
 * Route: GET /api/v1/sales
 * Retrieves a paginated list of sales history matching query filters.
 */
router.get('/', listSalesController);

/**
 * Route: GET /api/v1/sales/filter-users
 * Retrieves distinct staff users who have processed sales for UI filter dropdowns.
 */
router.get('/filter-users', listSalesFilterUsersController);

/**
 * Route: POST /api/v1/sales
 * Completes a POS sale transaction atomically.
 */
router.post('/', validate(saleCreateSchema), completeSaleController);

/**
 * Route: POST /api/v1/sales/:id/void
 * Voids an existing sale, restores stock, and reverses warranties (Admin only).
 */
router.post(
  '/:id/void',
  requireRole('admin'),
  parseSaleId,
  validate(voidSaleSchema),
  voidSaleController
);

/**
 * Route: GET /api/v1/sales/:id
 * Retrieves full details and line items for a specific sale.
 */
router.get('/:id', parseSaleId, getSaleController);

export default router;
