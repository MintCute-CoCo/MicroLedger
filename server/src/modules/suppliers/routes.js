import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import {
  createSupplierController,
  listSuppliersController,
  updateSupplierController,
} from './controller.js';
import { supplierCreateSchema, supplierUpdateSchema } from './schema.js';

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
        new HttpError(422, 'VALIDATION_FAILED', 'Check the supplier fields.', errorIssues)
      );
    }

    req.body = result.data;
    return next();
  };
}

/**
 * All supplier endpoints require an active authenticated user session.
 */
router.use(authenticate);

/**
 * Route: GET /api/v1/suppliers
 * Retrieves a list of suppliers (available to both Staff and Admin).
 */
router.get('/', listSuppliersController);

/**
 * Route: POST /api/v1/suppliers
 * Creates a new supplier catalog record (Admin only).
 */
router.post(
  '/',
  requireRole('admin'),
  validate(supplierCreateSchema),
  createSupplierController
);

/**
 * Route: PATCH /api/v1/suppliers/:id
 * Updates an existing supplier record (Admin only).
 */
router.patch(
  '/:id',
  requireRole('admin'),
  validate(supplierUpdateSchema),
  updateSupplierController
);

export default router;
