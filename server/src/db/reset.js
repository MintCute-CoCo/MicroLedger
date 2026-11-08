/**
 * ============================================================================
 * MicroLedger Complete Database Reset & Initialization Script
 * ============================================================================
 *
 * PURPOSE:
 * 1. Rolls back all existing Knex migrations completely.
 * 2. Runs all forward migrations up to latest (Core Schema + Phase 2 Warranty).
 * 3. Creates/configures the PostgreSQL `app_user` role and grants append-only permissions.
 * 4. Seeds the initial Administrator account (`admin`) and default store settings.
 * 5. Provisions the default active Staff account (`minhanh`).
 */

import 'dotenv/config';
import knex from 'knex';
import config from '../../knexfile.js';
import { hashPassword } from '../utils/passwords.js';
import pg from 'pg';

const db = knex(config);

/**
 * Executes a full database teardown, migration run, permission setup, and initial seed.
 *
 * @returns {Promise<void>} Resolves when reset completes.
 */
async function reset() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_DB !== 'true') {
    throw new Error('Refusing to execute destructive db:reset in production without ALLOW_DESTRUCTIVE_DB=true');
  }

  console.log('🔄 Starting complete MicroLedger database reset...');

  try {
    // 1. Rollback all migrations
    console.log('Rolling back all database migrations...');
    await db.migrate.rollback(undefined, true);

    // 2. Run migrations up to latest
    console.log('Running all migrations up to latest...');
    await db.migrate.latest();

    // 3. Configure app_user database role and append-only permissions
    console.log('Configuring database app_user role and append-only grants...');
    const { Client } = pg;
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const password = process.env.APP_DB_ROLE_PASSWORD || (isProduction ? null : 'microledger_app_pass_123');
      if (!password) {
        throw new Error('APP_DB_ROLE_PASSWORD is required for production role configuration');
      }
      // Escapes string literal for safe SQL formatting
      const quoteLiteral = (v) => `'${v.replaceAll("'", "''")}'`;
      // Escapes identifier name for safe SQL formatting
      const quoteIdentifier = (v) => `"${v.replaceAll('"', '""')}"`;
      const databaseName = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1));

      const role = await client.query("SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_user'");
      await client.query(`${role.rowCount ? 'ALTER' : 'CREATE'} ROLE app_user LOGIN PASSWORD ${quoteLiteral(password)}`);
      await client.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO app_user`);
      await client.query('GRANT USAGE ON SCHEMA public TO app_user');
      await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user');
      await client.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user');
      await client.query('REVOKE UPDATE, DELETE ON audit_logs, inventory_transactions, sale_items FROM app_user');
      await client.query('REVOKE DELETE ON sales FROM app_user');
      await client.query('REVOKE UPDATE ON sales FROM app_user');
      await client.query('GRANT UPDATE (status, voided_by, voided_at, void_reason) ON sales TO app_user');
      await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user');
      await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user');
    } finally {
      await client.end();
    }

    // 4. Run seeds (Initial Admin + Store Settings)
    console.log('Seeding initial Admin account and default settings...');
    await db.seed.run({ specific: '001_initial_admin.js' });

    // 5. Ensure active staff account (minhanh) is available for POS operations
    const staffUser = await db('users').whereRaw('lower(username) = ?', ['minhanh']).first();
    if (!staffUser) {
      const staffHash = await hashPassword('staffpassword123');
      await db('users').insert({
        username: 'minhanh',
        password_hash: staffHash,
        full_name: 'Minh Anh (Cashier)',
        role: 'staff',
        status: 'active',
        must_change_password: false,
      });
      console.log('Created default active Staff user: `minhanh`');
    }

    console.log('\n✅ Database reset successfully completed!');
    console.log('Initial accounts provisioned: `admin` and `minhanh`.');
    console.log('Tables are clean with 0 test products or sales.');
  } catch (err) {
    console.error('❌ Failed to reset database:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

reset();
