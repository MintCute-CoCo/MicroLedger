import 'dotenv/config';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const { Client } = pg;

describe('Database Security: Append-Only Enforcement (SRS-AUD-03, NFR-12)', () => {
  it('app_user cannot UPDATE or DELETE on audit_logs or inventory_transactions', async () => {
    assert.ok(process.env.APP_DATABASE_URL, 'APP_DATABASE_URL must be configured');
    const client = new Client({ connectionString: process.env.APP_DATABASE_URL });
    await client.connect();

    try {
      // 1. UPDATE on audit_logs must fail
      await assert.rejects(
        async () => {
          await client.query("UPDATE audit_logs SET action = 'tampered' WHERE id = 1");
        },
        (err) => {
          assert.equal(err.code, '42501', 'Must throw permission denied (42501)');
          return true;
        }
      );

      // 2. DELETE on audit_logs must fail
      await assert.rejects(
        async () => {
          await client.query('DELETE FROM audit_logs WHERE id = 1');
        },
        (err) => {
          assert.equal(err.code, '42501', 'Must throw permission denied (42501)');
          return true;
        }
      );

      // 3. UPDATE on inventory_transactions must fail
      await assert.rejects(
        async () => {
          await client.query("UPDATE inventory_transactions SET reason = 'tampered' WHERE id = 1");
        },
        (err) => {
          assert.equal(err.code, '42501', 'Must throw permission denied (42501)');
          return true;
        }
      );

      // 4. DELETE on inventory_transactions must fail
      await assert.rejects(
        async () => {
          await client.query('DELETE FROM inventory_transactions WHERE id = 1');
        },
        (err) => {
          assert.equal(err.code, '42501', 'Must throw permission denied (42501)');
          return true;
        }
      );
    } finally {
      await client.end();
    }
  });
});
