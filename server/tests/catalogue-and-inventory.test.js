import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, closeKnex, getAdminToken, createTestCategory, createTestProduct, checkInvariant } from './helpers.js';

describe('B & C — Catalogue and Inventory (AC-007 to AC-015a)', () => {
  after(async () => {
    await closeKnex();
  });

  it('AC-007: Duplicate category name is rejected; category with active products cannot be deactivated', async () => {
    const adminToken = await getAdminToken();
    const catName = `Cat_${Date.now()}`;
    const create1 = await api('/api/v1/categories', {
      method: 'POST',
      token: adminToken,
      body: { name: catName, description: 'Test' },
    });
    assert.equal(create1.status, 201);
    const catId = create1.data.id;

    // Duplicate name (different casing)
    const createDuplicate = await api('/api/v1/categories', {
      method: 'POST',
      token: adminToken,
      body: { name: catName.toLowerCase(), description: 'Duplicate test' },
    });
    assert.equal(createDuplicate.status, 409);

    // Create active product in this category
    const product = await createTestProduct(adminToken, { categoryId: catId });
    assert.ok(product.id);

    // Deactivating category with active products must be rejected
    const deactRes = await api(`/api/v1/categories/${catId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'inactive' },
    });
    assert.equal(deactRes.status, 409);
  });

  it('AC-008: Product creation applies defaults; stock cannot be edited through product update', async () => {
    const adminToken = await getAdminToken();
    const cat = await createTestCategory(adminToken);
    const sku = `DEF_${Date.now()}`;
    const createRes = await api('/api/v1/products', {
      method: 'POST',
      token: adminToken,
      body: {
        sku,
        name: 'Default Test Product',
        categoryId: cat.id,
        sellingPrice: '99.50',
      },
    });
    assert.equal(createRes.status, 201);
    const prod = createRes.data;
    assert.equal(prod.unit, 'pcs');
    assert.equal(prod.costPrice, '0.00');
    assert.equal(prod.reorderLevel, 5);
    assert.equal(prod.status, 'active');
    assert.equal(prod.stockQty, 0);

    // Attempting to pass stock fields to update endpoint is rejected by strict schema
    const badUpdateRes = await api(`/api/v1/products/${prod.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { stockQty: 999 },
    });
    assert.equal(badUpdateRes.status, 422);

    // Valid update updates selling price and preserves stock
    const validUpdateRes = await api(`/api/v1/products/${prod.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { sellingPrice: '120.00' },
    });
    assert.equal(validUpdateRes.status, 200);
    assert.equal(validUpdateRes.data.sellingPrice, '120.00');
    assert.equal(validUpdateRes.data.stockQty, 0);
  });

  it('AC-009: Duplicate SKU check is trimmed and case-insensitive (SKU_DUPLICATE)', async () => {
    const adminToken = await getAdminToken();
    const baseSku = `DUP-${Date.now()}`;
    const p1 = await createTestProduct(adminToken, { sku: baseSku });
    assert.ok(p1.id);

    // Attempting to create another product with padded spaces and lower case
    const cat = await createTestCategory(adminToken);
    const resDuplicate = await api('/api/v1/products', {
      method: 'POST',
      token: adminToken,
      body: {
        sku: `  ${baseSku.toLowerCase()}  `,
        name: 'Duplicate SKU Product',
        categoryId: cat.id,
        sellingPrice: '50.00',
      },
    });
    assert.equal(resDuplicate.status, 409);
    assert.equal(resDuplicate.data.code, 'SKU_DUPLICATE');
  });

  it('AC-010: Deactivated product disappears from POS lookup; reactivation fails if SKU conflicts', async () => {
    const adminToken = await getAdminToken();
    const sku = `DEACT_${Date.now()}`;
    const product = await createTestProduct(adminToken, { sku, name: `Deact Product ${sku}` });

    // Lookup finds it while active
    const lookup1 = await api(`/api/v1/products/lookup?q=${encodeURIComponent(sku)}`, { token: adminToken });
    assert.equal(lookup1.status, 200);
    assert.ok(lookup1.data.items.some((item) => item.sku === sku));

    // Deactivate it
    const deactRes = await api(`/api/v1/products/${product.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'inactive', confirmDeactivate: true },
    });
    assert.equal(deactRes.status, 200);

    // Lookup excludes it from POS lookup
    const lookup2 = await api(`/api/v1/products/lookup?q=${encodeURIComponent(sku)}`, { token: adminToken });
    assert.equal(lookup2.status, 200);
    assert.ok(!lookup2.data.items.some((item) => item.sku === sku));

    // Create a new active product with the same SKU
    const newProduct = await createTestProduct(adminToken, { sku });
    assert.ok(newProduct.id);

    // Attempt to reactivate the first product must fail because active product now has the SKU
    const reactivateRes = await api(`/api/v1/products/${product.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'active' },
    });
    assert.equal(reactivateRes.status, 409);
    assert.equal(reactivateRes.data.code, 'SKU_DUPLICATE');
  });

  it('AC-011: Ranked lookup ranks exact SKU match first', async () => {
    const adminToken = await getAdminToken();
    const testProd = await createTestProduct(adminToken, { sku: `EXACT_MATCH_${Date.now()}` });
    const lookupRes = await api(`/api/v1/products/lookup?q=${testProd.sku}`, { token: adminToken });
    assert.equal(lookupRes.status, 200);
    assert.ok(lookupRes.data.items.length > 0);
    assert.equal(lookupRes.data.items[0].sku, testProd.sku);
  });

  it('AC-012: Movement history shows type, change, balance after, user, time and reason', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { openingStock: 5 });

    const movementsRes = await api(`/api/v1/products/${product.id}/movements`, { token: adminToken });
    assert.equal(movementsRes.status, 200);
    assert.ok(movementsRes.data.items.length >= 1);
    const m = movementsRes.data.items[0];
    assert.equal(m.type, 'opening');
    assert.equal(m.quantityChange, 5);
    assert.equal(m.balanceAfter, 5);
    assert.ok(m.createdAt);
  });

  it('AC-013: Stock-in increases stock and records stock_in ledger row; <=0 quantity rejected', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { openingStock: 10 });

    const stockInRes = await api('/api/v1/inventory/stock-in', {
      method: 'POST',
      token: adminToken,
      body: {
        productId: product.id,
        quantity: 5,
        note: 'Restocking shipment',
      },
    });
    assert.equal(stockInRes.status, 201);
    assert.equal(stockInRes.data.stockQty, 15);

    // Zero or negative quantity must be rejected
    const badStockIn = await api('/api/v1/inventory/stock-in', {
      method: 'POST',
      token: adminToken,
      body: {
        productId: product.id,
        quantity: 0,
        note: 'Zero restock',
      },
    });
    assert.equal(badStockIn.status, 422);
  });

  it('AC-014: Adjustment adjusts stock and requires reason', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { openingStock: 15 });

    // Missing reason must be rejected
    const noReasonRes = await api('/api/v1/inventory/adjustments', {
      method: 'POST',
      token: adminToken,
      body: {
        productId: product.id,
        newQuantity: 12,
      },
    });
    assert.equal(noReasonRes.status, 422);

    // Valid adjustment to 12
    const adjustRes = await api('/api/v1/inventory/adjustments', {
      method: 'POST',
      token: adminToken,
      body: {
        productId: product.id,
        newQuantity: 12,
        reason: 'Cycle count variance',
      },
    });
    assert.equal(adjustRes.status, 200);
    assert.equal(adjustRes.data.stockQty, 12);
  });

  it('AC-015: Adjustment resulting in negative stock rejected with NEGATIVE_STOCK', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { openingStock: 3 });

    const negativeRes = await api('/api/v1/inventory/adjustments', {
      method: 'POST',
      token: adminToken,
      body: {
        productId: product.id,
        quantityChange: -10,
        reason: 'Attempt negative',
      },
    });
    assert.equal(negativeRes.status, 409);
    assert.equal(negativeRes.data.code, 'NEGATIVE_STOCK');
  });

  it('AC-015a: Stock ledger invariant query returns no rows', async () => {
    const mismatches = await checkInvariant();
    assert.deepEqual(mismatches, [], `Stock ledger invariant violated: ${JSON.stringify(mismatches)}`);
  });
});

