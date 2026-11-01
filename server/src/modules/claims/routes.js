import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  createClaimController,
  getClaimController,
  listClaimsController,
  transitionClaimController,
} from './controller.js';

/**
 * Warranty Claims Express Router
 *
 * Purpose:
 * Configures HTTP endpoints for the warranty claims workflow:
 * - Querying claims with status and search filters
 * - Submitting new claims
 * - Viewing individual claim details and audit status history
 * - Advancing claim status through the repair and replacement lifecycle
 */
const router = Router();

// Require user authentication for all warranty claims endpoints
router.use(authenticate);

// Route: GET / - List warranty claims with filtering and pagination
router.get(
  '/',
  listClaimsController
);

// Route: POST / - Create a new warranty claim
router.post(
  '/',
  createClaimController
);

// Route: GET /:id - Retrieve claim details and status history
router.get(
  '/:id',
  getClaimController
);

// Route: POST /:id/transitions - Advance claim status through lifecycle
router.post(
  '/:id/transitions',
  transitionClaimController
);

export default router;
