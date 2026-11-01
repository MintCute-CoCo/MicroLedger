import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import {
  createCategoryController,
  listCategoriesController,
  updateCategoryController,
} from './controller.js';
import { categoryCreateSchema, categoryUpdateSchema } from './schema.js';

/**
 * Category Module Express Router
 *
 * Purpose:
 * Configures HTTP endpoints for category management:
 * - Listing categories with status filters (all authenticated users)
 * - Creating new categories (Admin only)
 * - Updating existing categories and their status (Admin only)
 */
const router = Router();

// Enforce authentication on all category routes
router.use(authenticate);

/**
 * Express middleware factory that validates request body payloads against a Zod schema.
 *
 * Purpose:
 * Enforces input data contracts prior to invoking controller logic.
 * If validation fails, extracts field-level issue paths and messages, passing an HttpError 422
 * to the error handler. If valid, attaches the sanitized data to req.body.
 *
 * @param {import('zod').ZodSchema} schema - Zod validation schema.
 * @returns {import('express').RequestHandler} Express middleware handler.
 */
function validate(schema) {
  return (req, _res, next) => {
    // 1. Validate incoming request body
    const parseResult = schema.safeParse(req.body);

    // 2. Reject request if validation fails
    if (!parseResult.success) {
      const errorIssues = parseResult.error.issues;
      const formattedDetails = errorIssues.map((issue) => {
        const fieldPath = issue.path.join('.');
        const issueMessage = issue.message;
        return {
          field: fieldPath,
          message: issueMessage,
        };
      });

      const validationError = new HttpError(
        422,
        'VALIDATION_FAILED',
        'Check the submitted fields.',
        formattedDetails
      );
      return next(validationError);
    }

    // 3. Assign sanitized data to req.body and proceed
    req.body = parseResult.data;
    return next();
  };
}

/**
 * Express middleware that validates the URL parameter category ID.
 *
 * Purpose:
 * Ensures the category ID in the route path is a valid positive integer string.
 * Returns a 404 CATEGORY_NOT_FOUND error immediately if the format is invalid.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} _res - Express response object.
 * @param {import('express').NextFunction} next - Express next callback.
 * @returns {void}
 */
function parseId(req, _res, next) {
  const rawId = req.params.id;
  const isNumericString = /^\d+$/.test(rawId);

  // Validate format and ensure ID is greater than zero
  if (!isNumericString) {
    const notFoundError = new HttpError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
    return next(notFoundError);
  }

  const numericValue = BigInt(rawId);
  if (numericValue < 1n) {
    const notFoundError = new HttpError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
    return next(notFoundError);
  }

  return next();
}

// Route: GET / - Retrieve categories with optional status filter
router.get(
  '/',
  listCategoriesController
);

// Route: POST / - Create a new category (Admin only)
router.post(
  '/',
  requireRole('admin'),
  validate(categoryCreateSchema),
  createCategoryController
);

// Route: PATCH /:id - Update category details or status (Admin only)
router.patch(
  '/:id',
  requireRole('admin'),
  parseId,
  validate(categoryUpdateSchema),
  updateCategoryController
);

export default router;
