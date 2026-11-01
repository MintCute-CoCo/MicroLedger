/**
 * ============================================================================
 * MicroLedger Knex Migration & Seeding Configuration
 * ============================================================================
 *
 * PURPOSE:
 * Configures database migration and seeding parameters for Knex CLI commands.
 * Connects via DATABASE_URL using the administrative PostgreSQL owner role.
 */

import 'dotenv/config';

const connection = process.env.DATABASE_URL;
if (!connection) throw new Error('DATABASE_URL is required');

export default {
  client: 'pg',
  connection,
  migrations: { directory: './src/db/migrations', extension: 'js' },
  seeds: { directory: './src/db/seeds', extension: 'js' },
  pool: { min: 0, max: Number(process.env.DB_POOL_MAX ?? 10) },
};
