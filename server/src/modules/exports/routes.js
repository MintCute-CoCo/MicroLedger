import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { exportController } from './controller.js';

/**
 * Exports Module Express Router
 *
 * Purpose:
 * Configures HTTP endpoints for exporting datasets and analytical reports.
 * Restricts all export functionality strictly to users with the 'admin' role
 * according to system requirement SRS-EXP-01 and acceptance criteria AC-029.
 */
const router = Router();

// Middleware: Require user authentication and Admin role for all export endpoints
router.use(authenticate, requireRole('admin'));

// Route: GET /reports/:name - Export multi-sheet analytical reports (sales, inventory, warranty)
router.get(
  '/reports/:name',
  exportController
);

// Route: GET /:type - Export datasets (products, inventory, sales, claims)
router.get(
  '/:type',
  exportController
);

export default router;
