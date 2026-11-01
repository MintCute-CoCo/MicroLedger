/**
 * ============================================================================
 * MicroLedger Runtime Database Connection Pool (Knex Client)
 * ============================================================================
 *
 * PURPOSE:
 * Initializes the singleton Knex query builder client connected to PostgreSQL
 * via APP_DATABASE_URL using the privilege-restricted `app_user` database role.
 * Enforces fail-safe service unavailable (503) error if database is unconfigured.
 */

import knex from 'knex';
import { config } from '../config/env.js';

/**
 * Singleton Knex database instance or null if unconfigured.
 */
export const db = config.APP_DATABASE_URL
  ? knex({
    client: 'pg',
    connection: config.APP_DATABASE_URL,
    pool: { min: 0, max: Number(process.env.DB_POOL_MAX ?? 10) },
  })
  : null;

/**
 * Asserts that the runtime database client is initialized and returns it.
 *
 * @returns {import('knex').Knex} Active Knex database instance.
 * @throws {Error} 503 SERVICE_UNAVAILABLE if APP_DATABASE_URL is not set.
 */
export function requireDatabase() {
  if (!db) {
    const error = new Error('The API database is not configured. Set APP_DATABASE_URL.');
    error.status = 503;
    error.code = 'SERVICE_UNAVAILABLE';
    throw error;
  }
  return db;
}
