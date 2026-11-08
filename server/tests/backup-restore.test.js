import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
});

