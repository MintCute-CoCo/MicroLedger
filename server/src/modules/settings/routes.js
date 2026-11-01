import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import {
  getSettingsController,
  updateSettingsController,
} from './controller.js';

const router = Router();

/**
 * All settings endpoints require an active authenticated user session with administrator role.
 * Staff members must not view or edit system store settings (AC-033).
 */
router.use(authenticate, requireRole('admin'));

/**
 * Route: GET /api/v1/settings
 * Retrieves system store settings (currency code, precision decimals, and time zone).
 */
router.get('/', getSettingsController);

/**
 * Route: PATCH /api/v1/settings
 * Updates store settings configuration.
 */
router.patch('/', updateSettingsController);

export default router;
