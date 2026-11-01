import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { checkInvariant, closeKnex } from './helpers.js';

describe('Stock Ledger Invariant (SRS-INV-02, AC-015a)', () => {
  after(async () => {
    await closeKnex();
  });

  it('every product stock_qty matches sum of inventory_transactions quantity_change', async () => {
    const mismatches = await checkInvariant();
    assert.deepEqual(mismatches, [], `Stock ledger invariant violated for products: ${JSON.stringify(mismatches)}`);
  });
});
