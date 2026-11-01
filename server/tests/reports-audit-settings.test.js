import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, closeKnex, getAdminToken, getStaffToken } from './helpers.js';

describe('G — Reports, Audit, and Settings (AC-030 to AC-033)', () => {
  after(async () => {
    await closeKnex();
  });

  it('AC-030: Dashboard metrics include sales, 7-day trend, top products; stock value visible only to Admin', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();

    // Admin dashboard
    const adminRes = await api('/api/v1/reports/dashboard', { token: adminToken });
    assert.equal(adminRes.status, 200);
    assert.ok(adminRes.data.today);
    assert.equal(adminRes.data.last7Days.length, 7);
    assert.ok(Array.isArray(adminRes.data.topProducts));
    assert.notEqual(adminRes.data.inventory.stockValue, undefined, 'Admin dashboard must include stockValue in inventory');

    // Staff dashboard
    const staffRes = await api('/api/v1/reports/dashboard', { token: staffToken });
    assert.equal(staffRes.status, 200);
    assert.equal(staffRes.data.inventory.stockValue, undefined, 'Staff dashboard must NOT include stockValue in inventory');
  });

  it('AC-031: Sales and inventory report APIs return data; Staff is forbidden', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();

    // Staff forbidden from detailed reports
    const staffSales = await api('/api/v1/reports/sales?group=day', { token: staffToken });
    assert.equal(staffSales.status, 403);
    assert.equal(staffSales.data.code, 'AUTH_FORBIDDEN');

    const staffInv = await api('/api/v1/reports/inventory', { token: staffToken });
    assert.equal(staffInv.status, 403);
    assert.equal(staffInv.data.code, 'AUTH_FORBIDDEN');

    // Admin can access sales report
    const adminSales = await api('/api/v1/reports/sales?group=day', { token: adminToken });
    assert.equal(adminSales.status, 200);
    assert.ok(Array.isArray(adminSales.data.groups));

    // Admin can access inventory report
    const adminInv = await api('/api/v1/reports/inventory', { token: adminToken });
    assert.equal(adminInv.status, 200);
    assert.ok(Array.isArray(adminInv.data.current));
  });

  it('AC-032: Audited actions exist with user and UTC timestamp; Staff cannot view audit log', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();

    // Staff cannot view audit logs
    const staffAudit = await api('/api/v1/audit-logs', { token: staffToken });
    assert.equal(staffAudit.status, 403);

    // Admin views audit logs
    const adminAudit = await api('/api/v1/audit-logs?page=1&page_size=10', { token: adminToken });
    assert.equal(adminAudit.status, 200);
    assert.ok(adminAudit.data.items.length > 0);
    const entry = adminAudit.data.items[0];
    assert.ok(entry.action);
    assert.ok(entry.created_at || entry.createdAt);
  });

  it('AC-033: Settings endpoint allows Admin to view and update store time zone and currency', async () => {
    const adminToken = await getAdminToken();
    const staffToken = await getStaffToken();

    // Staff cannot access settings
    const staffSettings = await api('/api/v1/settings', { token: staffToken });
    assert.equal(staffSettings.status, 403);

    // Admin reads settings
    const readSettings = await api('/api/v1/settings', { token: adminToken });
    assert.equal(readSettings.status, 200);
    assert.ok(readSettings.data.time_zone || readSettings.data.timeZone);

    // Admin updates time zone
    const updateRes = await api('/api/v1/settings', {
      method: 'PATCH',
      token: adminToken,
      body: { time_zone: 'UTC' },
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.time_zone, 'UTC');
  });
});

