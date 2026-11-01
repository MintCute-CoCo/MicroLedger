import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, closeKnex, getAdminToken, getStaffToken, createTestProduct, checkInvariant, getKnex } from './helpers.js';

describe('D — POS, Sales, and Void (AC-016 to AC-023, NFR-08, NFR-09)', () => {
  after(async () => {
    await closeKnex();
  });

  it('AC-016 & AC-018: Sale merges duplicate items; validates discount and payment method', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { sellingPrice: '100.00', openingStock: 20 });

    // Merged items: 2 lines of same product (quantity 2 + 1 = 3 units -> subtotal 300.00)
    const saleRes = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': `IDEMP_${Date.now()}` },
      body: {
        items: [
          { productId: product.id, quantity: 2 },
          { productId: product.id, quantity: 1 },
        ],
        paymentMethod: 'cash',
        discountAmount: '50.00',
      },
    });
    assert.equal(saleRes.status, 201);
    assert.equal(saleRes.data.subtotal, '300.00');
    assert.equal(saleRes.data.discountAmount, '50.00');
    assert.equal(saleRes.data.total, '250.00');

    // Discount exceeding subtotal must be rejected
    const badDiscountRes = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': `IDEMP_${Date.now()}_BAD` },
      body: {
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'card',
        discountAmount: '500.00',
      },
    });
    assert.equal(badDiscountRes.status, 422);

    // Invalid payment method
    const badPayRes = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': `IDEMP_${Date.now()}_BAD_PAY` },
      body: {
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'crypto_currency',
      },
    });
    assert.equal(badPayRes.status, 422);
  });

  it('AC-017: Sale exceeding available stock rejected with INSUFFICIENT_STOCK', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { openingStock: 5 });

    const saleRes = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': `IDEMP_${Date.now()}` },
      body: {
        items: [{ productId: product.id, quantity: 10 }],
        paymentMethod: 'cash',
      },
    });
    assert.equal(saleRes.status, 409);
    assert.equal(saleRes.data.code, 'INSUFFICIENT_STOCK');
    assert.equal(saleRes.data.details.available, 5);
  });

  it('AC-017a: Concurrent sale of last unit (NFR-08): exactly one succeeds and stock ends at 0', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { openingStock: 1 });

    const key1 = `CONC_1_${Date.now()}_${Math.random()}`;
    const key2 = `CONC_2_${Date.now()}_${Math.random()}`;

    const [res1, res2] = await Promise.all([
      api('/api/v1/sales', {
        method: 'POST',
        token: adminToken,
        headers: { 'Idempotency-Key': key1 },
        body: { items: [{ productId: product.id, quantity: 1 }], paymentMethod: 'cash' },
      }),
      api('/api/v1/sales', {
        method: 'POST',
        token: adminToken,
        headers: { 'Idempotency-Key': key2 },
        body: { items: [{ productId: product.id, quantity: 1 }], paymentMethod: 'card' },
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [201, 409], 'Exactly one sale must succeed (201) and one fail (409)');

    // Verify stock is exactly 0
    const prodRes = await api(`/api/v1/products/${product.id}`, { token: adminToken });
    assert.equal(prodRes.data.stockQty, 0);
  });

  it('AC-020: Sale transaction creates sale, item snapshot, ledger row, and audit in one transaction', async () => {
    const staffToken = await getStaffToken();
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { sellingPrice: '150.00', openingStock: 10 });

    const key = `SALE_ATOMIC_${Date.now()}`;
    const saleRes = await api('/api/v1/sales', {
      method: 'POST',
      token: staffToken,
      headers: { 'Idempotency-Key': key },
      body: {
        items: [{ productId: product.id, quantity: 3 }],
        paymentMethod: 'cash',
      },
    });
    assert.equal(saleRes.status, 201);
    const saleId = saleRes.data.id;

    // Verify product stock reduced to 7
    const prodRes = await api(`/api/v1/products/${product.id}`, { token: adminToken });
    assert.equal(prodRes.data.stockQty, 7);

    // Verify item snapshot
    const detailRes = await api(`/api/v1/sales/${saleId}`, { token: staffToken });
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.data.items[0].sku, product.sku);
    assert.equal(detailRes.data.items[0].unitPrice, '150.00');
    assert.equal(detailRes.data.items[0].quantity, 3);

    // Verify ledger row
    const movementsRes = await api(`/api/v1/products/${product.id}/movements`, { token: adminToken });
    const saleMovement = movementsRes.data.items.find((m) => m.type === 'sale');
    assert.ok(saleMovement, 'Must have a sale movement');
    assert.equal(saleMovement.quantityChange, -3);
    assert.equal(saleMovement.balanceAfter, 7);

    // Verify stock ledger invariant
    const mismatches = await checkInvariant();
    assert.deepEqual(mismatches, []);
  });

  it('AC-020a: Rollback on failure (NFR-09): transaction error leaves stock intact and writes no partial records', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { openingStock: 5 });

    // Intentionally pass an invalid customerId that does not exist
    const key = `ROLLBACK_${Date.now()}`;
    const failRes = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': key },
      body: {
        items: [{ productId: product.id, quantity: 2 }],
        customerId: '999999999',
        paymentMethod: 'cash',
      },
    });
    assert.equal(failRes.status, 404);

    // Stock must remain intact at 5
    const prodRes = await api(`/api/v1/products/${product.id}`, { token: adminToken });
    assert.equal(prodRes.data.stockQty, 5);

    // Invariant holds
    const mismatches = await checkInvariant();
    assert.deepEqual(mismatches, []);
  });

  it('AC-021: Idempotency-Key replay returns existing sale without duplicate stock deduction', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { openingStock: 10 });
    const key = `IDEMP_REPLAY_${Date.now()}`;

    const res1 = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': key },
      body: { items: [{ productId: product.id, quantity: 2 }], paymentMethod: 'cash' },
    });
    assert.equal(res1.status, 201);

    const res2 = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': key },
      body: { items: [{ productId: product.id, quantity: 2 }], paymentMethod: 'cash' },
    });
    assert.equal(res2.status, 201);
    assert.equal(res1.data.id, res2.data.id, 'Must return the same sale record');

    // Stock must be deducted only once (10 - 2 = 8)
    const prodRes = await api(`/api/v1/products/${product.id}`, { token: adminToken });
    assert.equal(prodRes.data.stockQty, 8);
  });

  it('AC-022: Sales history is paginated; Staff responses contain no cost/profit data', async () => {
    const staffToken = await getStaffToken();
    const historyRes = await api('/api/v1/sales?page=1&page_size=5', { token: staffToken });
    assert.equal(historyRes.status, 200);
    assert.ok(historyRes.data.items.length > 0);
    for (const sale of historyRes.data.items) {
      assert.equal(sale.costPrice, undefined);
      assert.equal(sale.cost_price, undefined);
      assert.equal(sale.profit, undefined);
    }
  });

  it('AC-023: Admin voids sale with reason; stock restored; repeat void rejected; Staff cannot void', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();
    const product = await createTestProduct(adminToken, { openingStock: 10 });

    const key = `VOID_TEST_${Date.now()}`;
    const saleRes = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': key },
      body: { items: [{ productId: product.id, quantity: 3 }], paymentMethod: 'cash' },
    });
    assert.equal(saleRes.status, 201);
    const saleId = saleRes.data.id;

    // Staff cannot void
    const staffVoid = await api(`/api/v1/sales/${saleId}/void`, {
      method: 'POST',
      token: staffToken,
      body: { reason: 'Staff attempt to void' },
    });
    assert.equal(staffVoid.status, 403);

    // Admin voids with reason
    const adminVoid = await api(`/api/v1/sales/${saleId}/void`, {
      method: 'POST',
      token: adminToken,
      body: { reason: 'Customer requested cancellation' },
    });
    assert.equal(adminVoid.status, 200);
    assert.equal(adminVoid.data.status, 'voided');

    // Product stock restored to 10
    const prodRes = await api(`/api/v1/products/${product.id}`, { token: adminToken });
    assert.equal(prodRes.data.stockQty, 10);

    // Ledger row with type void_reversal (+3)
    const movementsRes = await api(`/api/v1/products/${product.id}/movements`, { token: adminToken });
    const voidMovement = movementsRes.data.items.find((m) => m.type === 'void_reversal');
    assert.ok(voidMovement);
    assert.equal(voidMovement.quantityChange, 3);
    assert.equal(voidMovement.balanceAfter, 10);

    // Second void fails with SALE_ALREADY_VOIDED (409)
    const secondVoid = await api(`/api/v1/sales/${saleId}/void`, {
      method: 'POST',
      token: adminToken,
      body: { reason: 'Repeat void' },
    });
    assert.equal(secondVoid.status, 409);
    assert.equal(secondVoid.data.code, 'SALE_ALREADY_VOIDED');
  });
});

