import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import {
  dashboardController,
  inventoryReportController,
  salesReportController,
  warrantyReportController,
} from './controller.js';

const router = Router();

/**
 * All reporting endpoints require an active authenticated user session.
 */
router.use(authenticate);

/**
 * Route: GET /api/v1/reports/dashboard
 * Retrieves top-level KPI metrics, trailing 7-day sales trends, and inventory counts.
 */
router.get('/dashboard', dashboardController);

/**
 * Route: GET /api/v1/reports/sales
 * Retrieves analytical sales breakdown by day, product, category, user, or payment method (Admin only).
 */
router.get('/sales', requireRole('admin'), salesReportController);

/**
 * Route: GET /api/v1/reports/inventory
 * Retrieves catalog inventory levels, movements, and stock valuation (Admin only).
 */
router.get('/inventory', requireRole('admin'), inventoryReportController);

/**
 * Route: GET /api/v1/reports/warranty
 * Retrieves warranty claim metrics, overdue return alerts, and supplier breakdowns.
 */
router.get('/warranty', warrantyReportController);

export default router;
