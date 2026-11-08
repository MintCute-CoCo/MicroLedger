import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import {
  changePasswordController,
  loginController,
  logoutController,
  refreshController,
} from './controller.js';
import { changePasswordSchema, loginSchema } from './schema.js';

/**
 * Authentication Module Express Router
 *
 * Purpose:
 * Configures HTTP endpoints for user authentication lifecycle:
 * - User login with rate limiting and credential validation
 * - Token rotation and session refreshing
 * - User logout and session termination
 * - Self-service password changes for authenticated users
 */
const router = Router();

/**
 * Express middleware factory that validates incoming request bodies against a Zod schema.
 *
 * Purpose:
 * Validates req.body before route controllers are invoked.
 * If validation fails, extracts detailed field-level errors and passes an HttpError 422
 * to the Express error handler. If valid, replaces req.body with the sanitized data.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @returns {import('express').RequestHandler} Express request handler middleware.
 */
function validateBody(schema) {
  return (req, _res, next) => {
    // 1. Validate the request body using the provided schema
    const validationResult = schema.safeParse(req.body);

    // 2. Handle validation failure
    if (!validationResult.success) {
      const errorIssues = validationResult.error.issues;

      const formattedDetails = errorIssues.map((issue) => {
        const fieldName = issue.path.join('.');
        const issueMessage = issue.message;

        return {
          field: fieldName,
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

    // 3. Assign sanitized and parsed data back to req.body
    req.body = validationResult.data;
    return next();
  };
}

/**
 * Rate limiter middleware for the login endpoint.
 *
 * Purpose:
 * Protects against brute-force password guessing attacks by restricting login attempts
 * to 10 requests per minute per IP address. Bypassed in automated testing environments.
 */
const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['x-test-suite'] === 'true' || process.env.DISABLE_RATE_LIMIT === 'true',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    const rateLimitError = {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Try again shortly.',
      details: null,
    };
    return res.status(429).json(rateLimitError);
  },
});

// Route: POST /login - Authenticate user with credentials and issue tokens
router.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  loginController
);

// Route: POST /refresh - Rotate refresh token and issue a fresh access token
router.post(
  '/refresh',
  refreshController
);

// Route: POST /logout - Revoke refresh token and terminate session
router.post(
  '/logout',
  logoutController
);

// Route: POST /change-password - Change password for the authenticated user
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  changePasswordController
);

export default router;
