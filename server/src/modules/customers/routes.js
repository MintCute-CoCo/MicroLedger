import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import {
  createCustomerController,
  listCustomersController,
  parseCustomerId,
  updateCustomerController,
} from './controller.js';
import { customerCreateSchema, customerUpdateSchema } from './schema.js';

/**
 * Customers Module Express Router
 *
 * Purpose:
 * Configures HTTP endpoints for customer profile management:
 * - Listing customers with search and pagination (authenticated users)
 * - Creating new customers with duplicate phone detection (authenticated users)
 * - Updating existing customer profiles (authenticated users)
 */
const router = Router();

// Require user authentication for all customer endpoints
router.use(authenticate);

/**
 * Express middleware factory that validates request body payloads against a Zod schema.
 *
 * Purpose:
 * Validates req.body prior to invoking controller logic.
 * If validation fails, formats field-level errors and passes an HttpError 422 to next().
 * If validation succeeds, assigns the sanitized data to req.body.
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

// Route: GET / - Retrieve paginated and searchable list of customers
router.get(
  '/',
  listCustomersController
);

// Route: POST / - Create a new customer profile
router.post(
  '/',
  validate(customerCreateSchema),
  createCustomerController
);

// Route: PATCH /:id - Update an existing customer profile
router.patch(
  '/:id',
  parseCustomerId,
  validate(customerUpdateSchema),
  updateCustomerController
);

export default router;
