/**
 * ============================================================================
 * MicroLedger Database Clean & Truncation Script
 * ============================================================================
 *
 * PURPOSE:
 * Truncates transactional, inventory, sales, customer, and catalog tables
 * while preserving system user credentials and default store settings.
 * Resets identity sequences (sale_no_seq, claim_no_seq) back to 1.
 */

import 'dotenv/config';
import knex from 'knex';
import config from '../../knexfile.js';
import { assertDestructiveOperationAllowed } from './target-guard.js';

const db = knex(config);

/**
 * Truncates application tables and resets sequence counters.
 *
 * @returns {Promise<void>} Resolves when truncation and sequence resets finish.
 */
async function clean() {
  assertDestructiveOperationAllowed(process.env.DATABASE_URL);

  console.log('Cleaning MicroLedger transactional and catalog data...');

  try {
    await db.raw(`
      TRUNCATE TABLE 
        claim_status_history,
        warranty_claims,
        warranties,
        sale_item_serials,
        sale_items,
        sales,
        inventory_transactions,
        products,
        categories,
        customers,
        suppliers,
        import_logs,
        audit_logs,
        refresh_tokens
      RESTART IDENTITY CASCADE;
    `);

    // Reset business sequences
    await db.raw(`ALTER SEQUENCE IF EXISTS sale_no_seq RESTART WITH 1;`);
    await db.raw(`ALTER SEQUENCE IF EXISTS claim_no_seq RESTART WITH 1;`);

    // Reset store settings to standard defaults
    await db('settings').where({ key: 'time_zone' }).update({ value: JSON.stringify('UTC') });
    await db('settings').where({ key: 'currency_code' }).update({ value: JSON.stringify('USD') });
    await db('settings').where({ key: 'currency_decimals' }).update({ value: 2 });

    console.log('✅ Clean complete: Products, sales, ledger, claims, customers, and audit logs wiped.');
    console.log('ℹ️ Admin and Staff accounts in `users` are preserved; store `settings` are reset to defaults.');
  } catch (err) {
    console.error('❌ Failed to clean database:', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

clean();

