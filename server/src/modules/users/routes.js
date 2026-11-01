import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import {
  createUserController,
  listUsersController,
  resetPasswordController,
  updateUserController,
} from './controller.js';
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from './schema.js';

const router = Router();

/**
 * All user management routes require an authenticated user with administrative privilege (AC-006).
 */
router.use(authenticate, requireRole('admin'));

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
 * Middleware validator ensuring req.params.id is a positive integer identifier.
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
    return next(new HttpError(404, 'USER_NOT_FOUND', 'User not found.'));
  }

  return next();
}

/**
 * Route: GET /api/v1/users
 * Retrieves all registered users in the system.
 */
router.get('/', listUsersController);

/**
 * Route: POST /api/v1/users
 * Provisions a new user account with temporary password.
 */
router.post('/', validate(createUserSchema), createUserController);

/**
 * Route: PATCH /api/v1/users/:id
 * Updates an existing user's display name, role, or active status.
 */
router.patch('/:id', parseId, validate(updateUserSchema), updateUserController);

/**
 * Route: POST /api/v1/users/:id/reset-password
 * Resets a user's password, forces password change, and revokes sessions.
 */
router.post(
  '/:id/reset-password',
  parseId,
  validate(resetPasswordSchema),
  resetPasswordController
);

export default router;
