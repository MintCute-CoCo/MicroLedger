/**
 * ============================================================================
 * MicroLedger Express Application Configuration & Routing Pipeline
 * ============================================================================
 *
 * PURPOSE:
 * Configures core HTTP middlewares (CORS, Cookie Parser, JSON Body Parser, Rate Limiter)
 * and mounts all 15 domain route modules under the `/api/v1` namespace.
 * Enforces centralized 404 and global error handling filters.
 */

import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import authRoutes from './modules/auth/routes.js';
import userRoutes from './modules/users/routes.js';
import categoryRoutes from './modules/categories/routes.js';
import productRoutes from './modules/products/routes.js';
import inventoryRoutes from './modules/inventory/routes.js';
import customerRoutes from './modules/customers/routes.js';
import salesRoutes from './modules/sales/routes.js';
import auditRoutes from './modules/audit/routes.js';
import reportRoutes from './modules/reports/routes.js';
import settingsRoutes from './modules/settings/routes.js';
import importRoutes from './modules/imports/routes.js';
import exportRoutes from './modules/exports/routes.js';
import supplierRoutes from './modules/suppliers/routes.js';
import warrantyRoutes from './modules/warranties/routes.js';
import claimRoutes from './modules/claims/routes.js';

export const app = express();

app.disable('x-powered-by');
if (config.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1', rateLimit({
  windowMs: 60_000,
  limit: 300,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.', details: null }),
}));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/imports', importRoutes);
app.use('/api/v1/exports', exportRoutes);
app.use('/api/v1/suppliers',supplierRoutes);
app.use('/api/v1/warranties',warrantyRoutes);
app.use('/api/v1/claims',claimRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
