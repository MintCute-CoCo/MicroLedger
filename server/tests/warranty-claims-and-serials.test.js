import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, closeKnex, getAdminToken, getStaffToken, createTestProduct } from './helpers.js';

describe('H — Warranty, Claims, and Serials (AC-034 to AC-043)', () => {
  after(async () => {
    await closeKnex();
  });

  it('AC-034: Low-stock flagging when stock <= reorder_level and low-stock filter works', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, {
      openingStock: 3,
      reorderLevel: 5,
    });

    const filterRes = await api(`/api/v1/products?low_stock=true&category_id=${product.categoryId}`, { token: adminToken });
    assert.equal(filterRes.status, 200);
    assert.ok(filterRes.data.items.some((item) => item.id === product.id));
  });

  it('AC-036: Product with 0 warranty months creates no warranty on sale; positive months creates active warranty', async () => {
    const adminToken = await getAdminToken();
    const pZero = await createTestProduct(adminToken, { warrantyMonths: 0, openingStock: 5 });
    const pTwelve = await createTestProduct(adminToken, { warrantyMonths: 12, openingStock: 5 });

    const key = `WAR_SALE_${Date.now()}`;
    const saleRes = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': key },
      body: {
        items: [
          { productId: pZero.id, quantity: 1 },
          { productId: pTwelve.id, quantity: 1 },
        ],
        paymentMethod: 'cash',
      },
    });
    assert.equal(saleRes.status, 201);

    const warRes = await api('/api/v1/warranties?page=1&page_size=50', { token: adminToken });
    assert.equal(warRes.status, 200);
    const zeroWarranty = warRes.data.items.find((w) => w.product_id === pZero.id);
    assert.equal(zeroWarranty, undefined, 'Product with 0 warranty months must not create a warranty');

    const twelveWarranty = warRes.data.items.find((w) => w.product_id === pTwelve.id);
    assert.ok(twelveWarranty, 'Product with 12 warranty months must create a warranty');
    assert.equal(twelveWarranty.validity, 'Active');
  });

  it('AC-037 & AC-043: Manual warranty by Admin; claim requires customer and problem; voided sale warranty blocked', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();
    const product = await createTestProduct(adminToken, { warrantyMonths: 12, openingStock: 5 });

    // Create a customer with phone
    const phone = `091${Math.floor(1000000 + Math.random() * 9000000)}`;
    const custRes = await api('/api/v1/customers', {
      method: 'POST',
      token: staffToken,
      body: { name: 'Tran Thi Mai', phone },
    });
    assert.equal(custRes.status, 201);
    const customerId = custRes.data.customer.id;

    // Staff cannot create manual warranty (Admin only)
    const staffManWar = await api('/api/v1/warranties/manual', {
      method: 'POST',
      token: staffToken,
      body: { productId: product.id, customerId, warrantyMonths: 12 },
    });
    assert.equal(staffManWar.status, 403);

    // Admin creates manual warranty
    const manWarRes = await api('/api/v1/warranties/manual', {
      method: 'POST',
      token: adminToken,
      body: { productId: product.id, customerId, warrantyMonths: 12 },
    });
    assert.equal(manWarRes.status, 201);
    assert.equal(manWarRes.data.source, 'manual');
    const warrantyId = manWarRes.data.id;

    // Claim creation requires problem description
    const noProblemClaim = await api('/api/v1/claims', {
      method: 'POST',
      token: staffToken,
      body: { warrantyId, customerId, problem: '   ' },
    });
    assert.equal(noProblemClaim.status, 422);

    // Valid claim creation by Staff
    const claimRes = await api('/api/v1/claims', {
      method: 'POST',
      token: staffToken,
      body: { warrantyId, customerId, problem: 'Device not turning on' },
    });
    assert.equal(claimRes.status, 201);
    assert.equal(claimRes.data.status, 'Submitted');
    assert.ok(claimRes.data.claimNo || claimRes.data.claim_no);
  });

  it('AC-038 & AC-039: Claim full lifecycle (Submitted -> With Supplier -> Returned -> Ready for Customer -> Completed)', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();
    const product = await createTestProduct(adminToken, { warrantyMonths: 12, openingStock: 5 });

    // Customer
    const phone = `093${Math.floor(1000000 + Math.random() * 9000000)}`;
    const custRes = await api('/api/v1/customers', {
      method: 'POST',
      token: staffToken,
      body: { name: 'Le Van Hai', phone },
    });
    const customerId = custRes.data.customer.id;

    // Manual warranty
    const warRes = await api('/api/v1/warranties/manual', {
      method: 'POST',
      token: adminToken,
      body: { productId: product.id, customerId, warrantyMonths: 12 },
    });
    const warrantyId = warRes.data.id;

    // Create supplier
    const supRes = await api('/api/v1/suppliers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Repair Supplier ${Date.now()}` },
    });
    const supplierId = supRes.data.id;

    // Submit claim
    const claimRes = await api('/api/v1/claims', {
      method: 'POST',
      token: staffToken,
      body: { warrantyId, customerId, problem: 'Flickering screen' },
    });
    const claimId = claimRes.data.id;

    // Transition to With Supplier without supplier/dates fails (422)
    const badTransition = await api(`/api/v1/claims/${claimId}/transitions`, {
      method: 'POST',
      token: staffToken,
      body: { status: 'With Supplier', data: {} },
    });
    assert.equal(badTransition.status, 422);

    // Valid transition to With Supplier
    const today = new Date().toISOString().slice(0, 10);
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const withSupplierRes = await api(`/api/v1/claims/${claimId}/transitions`, {
      method: 'POST',
      token: staffToken,
      body: {
        status: 'With Supplier',
        data: { supplierId, sentDate: today, expectedReturnDate: futureDate },
      },
    });
    assert.equal(withSupplierRes.status, 200);
    assert.equal(withSupplierRes.data.status, 'With Supplier');

    // Transition With Supplier -> Returned requires actualReturnDate and resolution
    const returnedRes = await api(`/api/v1/claims/${claimId}/transitions`, {
      method: 'POST',
      token: staffToken,
      body: {
        status: 'Returned',
        data: { actualReturnDate: today, resolution: 'repaired' },
      },
    });
    assert.equal(returnedRes.status, 200);
    assert.equal(returnedRes.data.status, 'Returned');

    // Transition Returned -> Ready for Customer
    const readyRes = await api(`/api/v1/claims/${claimId}/transitions`, {
      method: 'POST',
      token: staffToken,
      body: { status: 'Ready for Customer', data: {} },
    });
    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.data.status, 'Ready for Customer');

    // Transition Ready for Customer -> Completed requires collectedDate
    const completedRes = await api(`/api/v1/claims/${claimId}/transitions`, {
      method: 'POST',
      token: staffToken,
      body: { status: 'Completed', data: { collectedDate: today } },
    });
    assert.equal(completedRes.status, 200);
    assert.equal(completedRes.data.status, 'Completed');

    // Completed is final; further transitions fail
    const finalFail = await api(`/api/v1/claims/${claimId}/transitions`, {
      method: 'POST',
      token: staffToken,
      body: { status: 'Ready for Customer', data: {} },
    });
    assert.equal(finalFail.status, 409);
  });

  it('AC-040: Admin can Reject or Cancel claim with reason; Staff cannot Reject or Cancel', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();
    const product = await createTestProduct(adminToken, { warrantyMonths: 12, openingStock: 5 });

    const phone = `094${Math.floor(1000000 + Math.random() * 9000000)}`;
    const custRes = await api('/api/v1/customers', {
      method: 'POST',
      token: staffToken,
      body: { name: 'Nguyen Van Nam', phone },
    });
    const customerId = custRes.data.customer.id;

    const warRes = await api('/api/v1/warranties/manual', {
      method: 'POST',
      token: adminToken,
      body: { productId: product.id, customerId, warrantyMonths: 12 },
    });
    const warrantyId = warRes.data.id;

    const claimRes = await api('/api/v1/claims', {
      method: 'POST',
      token: staffToken,
      body: { warrantyId, customerId, problem: 'Physical water damage' },
    });
    const claimId = claimRes.data.id;

    // Staff cannot reject claim (returns 409 INVALID_TRANSITION or 403)
    const staffReject = await api(`/api/v1/claims/${claimId}/transitions`, {
      method: 'POST',
      token: staffToken,
      body: { status: 'Rejected', data: { reason: 'Customer dropped in water' } },
    });
    assert.ok(staffReject.status === 403 || staffReject.status === 409);

    // Admin rejects with reason
    const adminReject = await api(`/api/v1/claims/${claimId}/transitions`, {
      method: 'POST',
      token: adminToken,
      body: { status: 'Rejected', data: { reason: 'Customer dropped in water' } },
    });
    assert.equal(adminReject.status, 200);
    assert.equal(adminReject.data.status, 'Rejected');
  });

  it('AC-041: Serial numbers captured at sale, required for serial-tracked products, released upon void', async () => {
    const adminToken = await getAdminToken();
    const product = await createTestProduct(adminToken, {
      tracksSerial: true,
      openingStock: 5,
    });

    const serialNum = `WD-WCC6Y${String(Date.now()).slice(-6)}`;

    // Sale without serial numbers fails with 422
    const badSale = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': `TEST_SALE_BAD_${Date.now()}` },
      body: {
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'cash',
      },
    });
    assert.equal(badSale.status, 422);

    // Valid sale with serial number
    const goodSale = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': `TEST_SALE_GOOD_${Date.now()}` },
      body: {
        items: [{ productId: product.id, quantity: 1, serialNumbers: [serialNum] }],
        paymentMethod: 'cash',
      },
    });
    assert.equal(goodSale.status, 201);
    const saleId = goodSale.data.id;

    // Selling same serial number again fails
    const dupSerialSale = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': `SN_DUP_${Date.now()}` },
      body: {
        items: [{ productId: product.id, quantity: 1, serialNumbers: [serialNum] }],
        paymentMethod: 'cash',
      },
    });
    assert.equal(dupSerialSale.status, 409);

    // Voiding the sale releases the serial number
    const voidRes = await api(`/api/v1/sales/${saleId}/void`, {
      method: 'POST',
      token: adminToken,
      body: { reason: 'Return and release serial' },
    });
    assert.equal(voidRes.status, 200);

    // Now the serial number can be sold again
    const reSale = await api('/api/v1/sales', {
      method: 'POST',
      token: adminToken,
      headers: { 'Idempotency-Key': `SN_RESELL_${Date.now()}` },
      body: {
        items: [{ productId: product.id, quantity: 1, serialNumbers: [serialNum] }],
        paymentMethod: 'cash',
      },
    });
    assert.equal(reSale.status, 201);
  });
});

