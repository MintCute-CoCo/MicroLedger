import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { listAuditLogsController } from './controller.js';

/**
 * Audit Module Express Router
 *
 * Purpose:
 * Configures the HTTP endpoints for audit log inspection.
 * Applies access control rules to ensure that only authenticated administrators
 * have permission to view audit logs, adhering to system requirement SRS-AUD-02.
 */

// 1. Initialize the Express router instance for the audit module
const router = Router();

// 2. Register authentication and authorization middleware.
// All audit log endpoints require a valid user session and 'admin' role.
router.use(authenticate, requireRole('admin'));

// 3. Register route for retrieving paginated audit log records
router.get('/', listAuditLogsController);

export default router;
