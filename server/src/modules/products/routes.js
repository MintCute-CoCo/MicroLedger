import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import { listProductMovementsController } from '../inventory/controller.js';
import {
  createProductController,
  getProductController,
  listProductsController,
  lookupProductsController,
  updateProductController,
} from './controller.js';
import { productCreateSchema, productUpdateSchema } from './schema.js';

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
 * Middleware validator verifying that req.params.id is a valid positive integer identifier.
 * Rejects non-numeric or non-positive IDs with a 404 PRODUCT_NOT_FOUND error.
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
    return next(new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.'));
  }

  return next();
}

/**
 * All catalog product endpoints require an active authenticated user session.
 */
router.use(authenticate);

/**
 * Route: GET /api/v1/products
 * Retrieves a paginated list of catalog products with filtering and sorting.
 */
router.get('/', listProductsController);

/**
 * Route: GET /api/v1/products/lookup
 * Fast ranked search for active products used in Point of Sale (POS) checkouts.
 */
router.get('/lookup', lookupProductsController);

/**
 * Route: GET /api/v1/products/:id/movements
 * Retrieves inventory ledger stock movements for a specific product.
 */
router.get('/:id/movements', parseId, listProductMovementsController);

/**
 * Route: POST /api/v1/products
 * Creates a new catalog product (Admin only).
 */
router.post(
  '/',
  requireRole('admin'),
  validate(productCreateSchema),
  createProductController
);

/**
 * Route: GET /api/v1/products/:id
 * Retrieves full details for a single product.
 */
router.get('/:id', parseId, getProductController);

/**
 * Route: PATCH /api/v1/products/:id
 * Updates product metadata, pricing, or status (Admin only).
 */
router.patch(
  '/:id',
  requireRole('admin'),
  parseId,
  validate(productUpdateSchema),
  updateProductController
);

export default router;
