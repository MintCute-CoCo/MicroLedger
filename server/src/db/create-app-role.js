/**
 * ============================================================================
 * MicroLedger Database Privilege Provisioning Script (app_user Role)
 * ============================================================================
 *
 * PURPOSE:
 * Provisions the restricted `app_user` database role used by the runtime API.
 * Grants permissions to read and insert data while strictly revoking UPDATE and DELETE
 * on immutable append-only tables (`audit_logs`, `inventory_transactions`) to satisfy
 * academic requirements for financial-grade data integrity (SRS-AUD-03, NFR-12).
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const password = process.env.APP_DB_ROLE_PASSWORD;
if (!process.env.DATABASE_URL || !password) {
  throw new Error('DATABASE_URL and APP_DB_ROLE_PASSWORD are required');
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

/**
 * Escapes a literal string value for safe SQL execution.
 *
 * @param {string} value - String literal to quote and escape.
 * @returns {string} Quoted SQL string literal.
 */
const quoteLiteral = (value) => `'${value.replaceAll("'", "''")}'`;

/**
 * Escapes an identifier name (such as database or table name) for safe SQL execution.
 *
 * @param {string} value - Identifier name to escape.
 * @returns {string} Quoted SQL identifier.
 */
const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;

const databaseName = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1));
if (!databaseName) throw new Error('DATABASE_URL must include a database name');

try {
  await client.connect();
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
  console.log('app_user role and grants are ready');
} finally {
  await client.end();
}
