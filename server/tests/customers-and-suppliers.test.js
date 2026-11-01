import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, closeKnex, getAdminToken, getStaffToken } from './helpers.js';

describe('E & H — Customers and Suppliers (AC-019, AC-024, AC-035)', () => {
  after(async () => {
    await closeKnex();
  });

  it('AC-019 & AC-024: Customer create and search; duplicate phone returns duplicate warning; cannot delete', async () => {
    const staffToken = await getStaffToken();
    const phone = `090${Math.floor(1000000 + Math.random() * 9000000)}`;

    // Create new customer
    const createRes = await api('/api/v1/customers', {
      method: 'POST',
      token: staffToken,
      body: { name: 'Customer One', phone },
    });
    assert.equal(createRes.status, 201);
    const customer = createRes.data.customer;
    assert.equal(customer.name, 'Customer One');
    assert.equal(customer.phone, phone);
    assert.equal(createRes.data.warning, null);

    // Search by partial phone
    const searchRes = await api(`/api/v1/customers?q=${phone.slice(-4)}`, { token: staffToken });
    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.data.items.some((c) => c.phone === phone));

    // Creating another customer with duplicate phone is accepted with warning
    const duplicateRes = await api('/api/v1/customers', {
      method: 'POST',
      token: staffToken,
      body: { name: 'Customer Two', phone },
    });
    assert.equal(duplicateRes.status, 201);
    assert.ok(duplicateRes.data.warning);
    assert.equal(duplicateRes.data.warning.code, 'CUSTOMER_PHONE_EXISTS');

    // Customers cannot be deleted (DELETE endpoint not implemented)
    const deleteRes = await api(`/api/v1/customers/${customer.id}`, {
      method: 'DELETE',
      token: staffToken,
    });
    assert.ok(deleteRes.status === 404 || deleteRes.status === 405);
  });

  it('AC-035: Staff can view but not edit suppliers; Admin can manage suppliers', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();

    // Staff can list suppliers
    const listRes = await api('/api/v1/suppliers', { token: staffToken });
    assert.equal(listRes.status, 200);

    // Staff cannot create a supplier
    const staffCreate = await api('/api/v1/suppliers', {
      method: 'POST',
      token: staffToken,
      body: { name: 'Staff Supplier Attempt' },
    });
    assert.equal(staffCreate.status, 403);
    assert.equal(staffCreate.data.code, 'AUTH_FORBIDDEN');

    // Admin creates supplier
    const supName = `Supplier_${Date.now()}`;
    const adminCreate = await api('/api/v1/suppliers', {
      method: 'POST',
      token: adminToken,
      body: { name: supName, contact_person: 'Contact Person', phone: '0123456789' },
    });
    assert.equal(adminCreate.status, 201);
    const supId = adminCreate.data.id;

    // Staff cannot update supplier
    const staffUpdate = await api(`/api/v1/suppliers/${supId}`, {
      method: 'PATCH',
      token: staffToken,
      body: { name: 'Staff Rename' },
    });
    assert.equal(staffUpdate.status, 403);

    // Admin updates supplier
    const adminUpdate = await api(`/api/v1/suppliers/${supId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { contact_person: 'Updated Contact' },
    });
    assert.equal(adminUpdate.status, 200);
    assert.equal(adminUpdate.data.contactPerson || adminUpdate.data.contact_person, 'Updated Contact');
  });
});

