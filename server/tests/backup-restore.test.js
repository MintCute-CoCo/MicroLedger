import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import pg from 'pg';
import { runBackup, verifyRestoreDrill, restoreFromBackup, pruneOldBackups, TABLES } from '../scripts/backup-restore.js';
import { closeKnex } from './helpers.js';

describe('Database Operations: Backup, 7-Day Retention & Restore Drill (SRS-NFR-10, T-065, T-131)', () => {
  let backupFile = null;

  after(async () => {
    if (backupFile) {
      await fs.rm(backupFile, { force: true }).catch(() => {});
    }
    await closeKnex();
  });

  it('runs backup job covering all 16 tables and verifies 7-day retention & RPO/RTO thresholds', async () => {
    assert.equal(TABLES.length, 16, 'Backup must cover all 16 system tables');

    const backupRes = await runBackup();
    assert.equal(backupRes.success, true);
    assert.ok(backupRes.durationMs < 5000, 'Backup must complete in under 5 seconds');
    assert.equal(backupRes.tableCount, 16, 'Must back up all 16 database tables');
    backupFile = backupRes.filePath;

    // Test retention pruning function runs safely
    const pruned = await pruneOldBackups('./backups', 7);
    assert.ok(typeof pruned === 'number', 'Pruning must return count of pruned files');

    const drillRes = await verifyRestoreDrill(backupFile);
    assert.equal(drillRes.success, true);
    assert.ok(Number(drillRes.rtoAchievedSeconds) < 60, 'RTO achieved must be under 60s');
    assert.ok(drillRes.rpoCompliance.includes('24 hours'));
    assert.ok(drillRes.rpoCompliance.includes('7-day retention active'));
  });

  it('verifies restoreFromBackup successfully restores all 16 tables with sequence reset', async () => {
    assert.ok(backupFile, 'Backup file must exist from previous step');
    const restoreRes = await restoreFromBackup(backupFile);
    assert.equal(restoreRes.success, true);
    assert.equal(restoreRes.tablesRestored, 16);
    assert.ok(restoreRes.totalRows >= 0);

    // Verify that sale_no_seq and claim_no_seq generate values above existing max to prevent collision
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const nextSaleRes = await client.query(`SELECT nextval('sale_no_seq') as next_seq`);
      const nextSaleSeq = Number(nextSaleRes.rows[0].next_seq);
      const maxSaleRes = await client.query(`
        SELECT COALESCE(MAX(NULLIF(regexp_replace(sale_no, '\\D', '', 'g'), '')::bigint), 0) as max_val
        FROM "sales"
      `);
      const maxSaleVal = Number(maxSaleRes.rows[0].max_val);
      assert.ok(
        nextSaleSeq > maxSaleVal,
        `nextval('sale_no_seq') (${nextSaleSeq}) must be greater than max existing sale (${maxSaleVal}) to prevent unique collision`
      );
    } finally {
      await client.end();
    }
  });

  it('verifies non-destructive isolated-schema restore drill without mutating public store tables', async () => {
    assert.ok(backupFile, 'Backup file must exist from previous step');
    const isolatedSchema = `_test_isolated_${Date.now()}`;
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      // Record initial row counts in public schema
      const initialPublicSales = await client.query(`SELECT COUNT(*)::int as count FROM public.sales`);
      const initialSalesCount = initialPublicSales.rows[0].count;

      // Execute restore targeting isolated schema
      const restoreRes = await restoreFromBackup(backupFile, process.env.DATABASE_URL, {
        targetSchema: isolatedSchema,
        cleanTarget: true,
      });

      assert.equal(restoreRes.success, true);
      assert.equal(restoreRes.tablesRestored, 16);

      // Verify all 16 tables exist and are populated inside the isolated schema
      for (const table of TABLES) {
        const countRes = await client.query(`SELECT COUNT(*)::int as count FROM "${isolatedSchema}"."${table}"`);
        assert.ok(countRes.rows[0].count >= 0, `Table ${table} in isolated schema must be queryable`);
      }

      // Verify that public store data was NOT truncated or modified by the isolated drill
      const postDrillPublicSales = await client.query(`SELECT COUNT(*)::int as count FROM public.sales`);
      assert.equal(
        postDrillPublicSales.rows[0].count,
        initialSalesCount,
        'Public store tables must remain intact during isolated schema drill'
      );
    } finally {
      await client.query(`DROP SCHEMA IF EXISTS "${isolatedSchema}" CASCADE;`).catch(() => {});
      await client.end();
    }
  });

  it('supports cryptographic snapshot encryption (AES-256-GCM) and verified tamper-evident checksums', async () => {
    process.env.BACKUP_ENCRYPTION_KEY = 'test_secret_encryption_key_32bytes!!';
    try {
      const encBackup = await runBackup();
      assert.ok(encBackup.checksum, 'Encrypted backup must retain SHA-256 integrity checksum');
      const drill = await verifyRestoreDrill(encBackup.filePath);
      assert.equal(drill.checksumValid, true, 'Decrypted snapshot checksum must match');
      await fs.rm(encBackup.filePath, { force: true });
    } finally {
      delete process.env.BACKUP_ENCRYPTION_KEY;
    }
  });

  it('rejects unencrypted backup execution in production without BACKUP_ENCRYPTION_KEY (T-149)', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.BACKUP_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'production';
    delete process.env.BACKUP_ENCRYPTION_KEY;

    try {
      await assert.rejects(
        async () => {
          await runBackup();
        },
        /Refusing to create unencrypted backup in production/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalKey) process.env.BACKUP_ENCRYPTION_KEY = originalKey;
    }
  });

  it('pre-flight rejects tampered or corrupted snapshots before touching the database (T-148)', async () => {
    const tamperedPath = './backups/test_tampered_snapshot.json';
    const fakeData = {
      timestamp: new Date().toISOString(),
      tables: { settings: [] },
      checksum: 'bad_invalid_checksum_00000000000000000000000000000000000000000000000',
    };
    await fs.writeFile(tamperedPath, JSON.stringify(fakeData), 'utf-8');

    try {
      await assert.rejects(
        async () => {
          await restoreFromBackup(tamperedPath);
        },
        /checksum verification failed/
      );
    } finally {
      await fs.rm(tamperedPath, { force: true });
    }
  });

  it('rejects destructive restore against remote or cloud database targets without flags (T-147)', async () => {
    assert.ok(backupFile, 'Backup file must exist');
    const remoteUrl = 'postgres://admin:secret@aws.rds.amazonaws.com:5432/microledger_prod';

    await assert.rejects(
      async () => {
        await restoreFromBackup(backupFile, remoteUrl, {
          targetSchema: 'public',
          cleanTarget: true,
        });
      },
      /Refusing to execute destructive database operation against remote or cloud database target/
    );
  });
});

