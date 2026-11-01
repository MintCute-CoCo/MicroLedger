import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import {
  attachWarrantyCustomerController,
  createManualWarrantyController,
  listWarrantiesController,
} from './controller.js';

/**
 * Warranties Express Router
 *
 * Defines API endpoints for warranty lookup, manual warranty issuance,
 * and customer attachment.
 * All routes require authentication; manual issuance requires the 'admin' role.
 */

const router = Router();

// Enforce authentication on all warranty endpoints
router.use(authenticate);

// GET /api/v1/warranties - List warranties with search and validity filtering
router.get('/', listWarrantiesController);

// POST /api/v1/warranties/manual - Manually issue warranty (Admin only)
router.post('/manual', requireRole('admin'), createManualWarrantyController);

// PATCH /api/v1/warranties/:id/customer - Attach customer to anonymous warranty
router.patch('/:id/customer', attachWarrantyCustomerController);

export default router;
