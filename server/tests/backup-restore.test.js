import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runBackup, verifyRestoreDrill } from '../scripts/backup-restore.js';
import { closeKnex } from './helpers.js';

describe('Database Operations: Backup & Restore Drill (SRS-NFR-10, T-065)', () => {
  let backupFile = null;

  after(async () => {
    if (backupFile) {
      await fs.rm(backupFile, { force: true }).catch(() => {});
    }
    await closeKnex();
  });

  it('runs backup job and verifies RPO/RTO compliance within measurable thresholds', async () => {
    const backupRes = await runBackup();
    assert.equal(backupRes.success, true);
    assert.ok(backupRes.durationMs < 5000, 'Backup must complete in under 5 seconds');
    assert.ok(backupRes.tableCount >= 10, 'Must back up all core database tables');
    backupFile = backupRes.filePath;

    const drillRes = await verifyRestoreDrill(backupFile);
    assert.equal(drillRes.success, true);
    assert.ok(Number(drillRes.rtoAchievedSeconds) < 60, 'RTO achieved must be well below 1 working day (under 60s)');
    assert.ok(drillRes.rpoCompliance.includes('24 hours'));
  });
});

