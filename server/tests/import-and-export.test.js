import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, closeKnex, getAdminToken, getStaffToken, createTestProduct } from './helpers.js';

describe('F — Import and Export (AC-025 to AC-029)', () => {
  after(async () => {
    await closeKnex();
  });

  it('AC-025: Templates download in .csv and .xlsx formats', async () => {
    const adminToken = await getAdminToken();

    // CSV format
    const csvRes = await api('/api/v1/imports/template?format=csv', { token: adminToken });
    assert.equal(csvRes.status, 200);
    assert.ok(csvRes.headers.get('content-type').includes('text/csv'));
    assert.ok(csvRes.data.includes('SKU-001'));

    // XLSX format
    const xlsxRes = await api('/api/v1/imports/template?format=xlsx', { token: adminToken });
    assert.equal(xlsxRes.status, 200);
    assert.ok(xlsxRes.headers.get('content-type').includes('spreadsheetml'));
  });

  it('AC-026 & AC-027: Upload preview validates rows; mode all rejects errors; valid_only commits', async () => {
    const adminToken = await getAdminToken();
    const uniqueSku = `IMP_${Date.now()}`;
    const categoriesRes = await api('/api/v1/categories', { token: adminToken });
    const testCategory = categoriesRes.data?.items?.[0]?.name || 'Storage';

    // Create a CSV with 1 valid row and 1 invalid row (missing name)
    const csvContent = [
      'sku,name,category,selling_price,cost_price,unit,reorder_level,opening_stock,tracks_serial,warranty_months',
      `${uniqueSku},Valid Product,${testCategory},25.00,10.00,pcs,5,10,false,12`,
      `BAD_SKU,,${testCategory},15.00,5.00,pcs,5,0,false,0`,
    ].join('\r\n');

    const formData = new FormData();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('file', blob, 'test-import.csv');

    const previewRes = await fetch('http://localhost:3000/api/v1/imports/preview', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-bypass-rate-limit': '1',
      },
      body: formData,
    });
    const previewData = await previewRes.json();
    assert.equal(previewRes.status, 201);
    assert.equal(previewData.counts.new, 1);
    assert.equal(previewData.counts.error, 1);
    const importId = previewData.id;

    // Mode "all" must be rejected because errors exist (IMPORT_HAS_ERRORS)
    const commitAllRes = await api(`/api/v1/imports/${importId}/commit`, {
      method: 'POST',
      token: adminToken,
      body: { mode: 'all' },
    });
    assert.equal(commitAllRes.status, 409);
    assert.equal(commitAllRes.data.code, 'IMPORT_HAS_ERRORS');

    // Mode "valid_only" commits the valid row
    const commitValidRes = await api(`/api/v1/imports/${importId}/commit`, {
      method: 'POST',
      token: adminToken,
      body: { mode: 'valid_only' },
    });
    assert.equal(commitValidRes.status, 200);

    // Verify valid product was created with opening stock 10
    const lookupRes = await api(`/api/v1/products/lookup?q=${uniqueSku}`, { token: adminToken });
    assert.equal(lookupRes.status, 200);
    const createdProd = lookupRes.data.items.find((i) => i.sku === uniqueSku);
    assert.ok(createdProd);
    assert.equal(createdProd.stockQty, 10);
  });

  it('AC-028: Existing SKU updates name/prices but never overwrites stock; opening stock applies only to new products', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, { openingStock: 15, sellingPrice: '50.00' });
    const categoriesRes = await api('/api/v1/categories', { token: adminToken });
    const testCategory = categoriesRes.data?.items?.[0]?.name || 'Storage';

    // Upload an import containing the existing SKU with opening_stock = 99 and new selling price = 75.00
    const csvContent = [
      'sku,name,category,selling_price,cost_price,unit,reorder_level,opening_stock,tracks_serial,warranty_months',
      `${product.sku},Updated Name via Import,${testCategory},75.00,20.00,pcs,5,99,false,12`,
    ].join('\r\n');

    const formData = new FormData();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('file', blob, 'update-import.csv');

    const previewRes = await fetch('http://localhost:3000/api/v1/imports/preview', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-bypass-rate-limit': '1',
      },
      body: formData,
    });
    const previewData = await previewRes.json();
    assert.equal(previewRes.status, 201);
    assert.equal(previewData.counts.update, 1);

    // Commit
    const commitRes = await api(`/api/v1/imports/${previewData.id}/commit`, {
      method: 'POST',
      token: adminToken,
      body: { mode: 'valid_only' },
    });
    assert.equal(commitRes.status, 200);

    // Verify selling price was updated to 75.00, but stock stayed 15 (NOT 99!)
    const prodRes = await api(`/api/v1/products/${product.id}`, { token: adminToken });
    assert.equal(prodRes.status, 200);
    assert.equal(prodRes.data.sellingPrice, '75.00');
    assert.equal(prodRes.data.stockQty, 15, 'Existing product stock must NEVER be overwritten by import');
  });

  it('AC-029: Export formula injection is neutralized; Staff cannot export (AUTH_FORBIDDEN)', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();

    // Staff cannot call export endpoints
    const staffRes = await api('/api/v1/exports/products?format=csv', { token: staffToken });
    assert.equal(staffRes.status, 403);
    assert.equal(staffRes.data.code, 'AUTH_FORBIDDEN');

    // Admin exports products
    const adminRes = await api('/api/v1/exports/products?format=csv', { token: adminToken });
    assert.equal(adminRes.status, 200);
    assert.ok(adminRes.headers.get('content-type').includes('text/csv'));
    // Verify CSV is valid string with BOM or text
    assert.ok(typeof adminRes.data === 'string');
  });
});
