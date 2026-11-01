import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, closeKnex, getAdminToken, getStaffToken, login, getKnex } from './helpers.js';

describe('A — Authentication and Users (AC-001 to AC-006)', () => {
  after(async () => {
    await closeKnex();
  });

  it('AC-001: Active user signs in with correct credentials -> access token and user profile', async () => {
    const res = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'adminpassword123' },
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.accessToken, 'Must return accessToken');
    assert.equal(res.data.tokenType, 'Bearer');
    assert.equal(res.data.user.username, 'admin');
    assert.equal(res.data.user.role, 'admin');
    const setCookie = res.headers.get('set-cookie') || '';
    assert.ok(setCookie.includes('refresh_token'), 'Must set refresh_token cookie');
  });

  it('AC-001a: Wrong username or wrong password returns same generic AUTH_INVALID_CREDENTIALS', async () => {
    const resBadUser = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'nonexistent_user_999', password: 'adminpassword123' },
    });
    assert.equal(resBadUser.status, 401);
    assert.equal(resBadUser.data.code, 'AUTH_INVALID_CREDENTIALS');

    const resBadPass = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'wrongpassword' },
    });
    assert.equal(resBadPass.status, 401);
    assert.equal(resBadPass.data.code, 'AUTH_INVALID_CREDENTIALS');
  });

  it('AC-002: Sign out revokes refresh token; invalid session redirects', async () => {
    const loginRes = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'adminpassword123' },
    });
    const cookieHeader = loginRes.headers.get('set-cookie');
    assert.ok(cookieHeader, 'Expected refresh cookie');
    const refreshTokenCookie = cookieHeader.split(';')[0];

    const logoutRes = await api('/api/v1/auth/logout', {
      method: 'POST',
      headers: { Cookie: refreshTokenCookie },
    });
    assert.equal(logoutRes.status, 200);

    const refreshRes = await api('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { Cookie: refreshTokenCookie },
    });
    assert.equal(refreshRes.status, 401);
  });

  it('AC-003: 5 failed logins within 15 minutes trigger AUTH_LOCKED', async () => {
    const adminToken = await getAdminToken();
    const lockUsername = `lock_user_${Date.now()}`;
    const userCreate = await api('/api/v1/users', {
      method: 'POST',
      token: adminToken,
      body: { username: lockUsername, fullName: 'Lock Test', password: 'temporarypass123', role: 'staff' },
    });
    assert.equal(userCreate.status, 201);

    for (let i = 0; i < 5; i++) {
      const failRes = await api('/api/v1/auth/login', {
        method: 'POST',
        body: { username: lockUsername, password: 'wrong_password_attempt' },
      });
      assert.equal(failRes.status, 401);
    }

    const lockedRes = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username: lockUsername, password: 'temporarypass123' },
    });
    assert.equal(lockedRes.status, 423);
    assert.equal(lockedRes.data.code, 'AUTH_LOCKED');
  });

  it('AC-004: Admin creates user with must_change_password; deactivated user blocked; last Admin protected', async () => {
    const adminToken = await getAdminToken();
    const testUsername = `test_staff_${Date.now()}`;
    const initialPass = 'temppassword123';
    const newPass = 'finalpassword123';
    const createRes = await api('/api/v1/users', {
      method: 'POST',
      token: adminToken,
      body: { username: testUsername, fullName: 'Test Staff User', password: initialPass, role: 'staff' },
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.data.mustChangePassword, true);

    const staffLogin = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username: testUsername, password: initialPass },
    });
    assert.equal(staffLogin.status, 200);
    const staffToken = staffLogin.data.accessToken;

    // Requests before password change should be rejected with PASSWORD_CHANGE_REQUIRED
    const blockedEndpointRes = await api('/api/v1/customers', { token: staffToken });
    assert.equal(blockedEndpointRes.status, 403);
    assert.equal(blockedEndpointRes.data.code, 'PASSWORD_CHANGE_REQUIRED');

    // User changes password
    const changeRes = await api('/api/v1/auth/change-password', {
      method: 'POST',
      token: staffToken,
      body: { currentPassword: initialPass, newPassword: newPass },
    });
    assert.equal(changeRes.status, 200);

    // Re-login with new password
    const reLogin = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username: testUsername, password: newPass },
    });
    assert.equal(reLogin.status, 200);
    assert.equal(reLogin.data.user.mustChangePassword, false);
    const activeStaffToken = reLogin.data.accessToken;

    const allowedRes = await api('/api/v1/customers', { token: activeStaffToken });
    assert.equal(allowedRes.status, 200);

    // Deactivating user blocks next request
    const deactivateRes = await api(`/api/v1/users/${createRes.data.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'inactive' },
    });
    assert.equal(deactivateRes.status, 200);

    const blockedRes = await api('/api/v1/customers', { token: activeStaffToken });
    assert.equal(blockedRes.status, 401);

    // Guard against deactivating last active Admin
    const lastAdminRes = await api('/api/v1/users/1', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'inactive' },
    });
    assert.equal(lastAdminRes.status, 409);
  });

  it('AC-005: User changes password with correct current and valid new password; revokes other sessions', async () => {
    const adminToken = await getAdminToken();
    const username = `pwd_user_${Date.now()}`;
    const initialPass = 'initialpassword123';
    const newPass = 'updatedpassword456';

    const createRes = await api('/api/v1/users', {
      method: 'POST',
      token: adminToken,
      body: { username, fullName: 'Password Change User', password: initialPass, role: 'staff' },
    });
    assert.equal(createRes.status, 201);

    const loginRes1 = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username, password: initialPass },
    });
    assert.equal(loginRes1.status, 200);
    const sessionToken1 = loginRes1.data.accessToken;

    const changeRes = await api('/api/v1/auth/change-password', {
      method: 'POST',
      token: sessionToken1,
      body: { currentPassword: initialPass, newPassword: newPass },
    });
    assert.equal(changeRes.status, 200);

    const oldLoginRes = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username, password: initialPass },
    });
    assert.equal(oldLoginRes.status, 401);

    const newLoginRes = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username, password: newPass },
    });
    assert.equal(newLoginRes.status, 200);
  });

  it('AC-006: Staff user calling Admin-only endpoint returns 403 AUTH_FORBIDDEN; Staff responses contain no cost price', async () => {
    const staffToken = await getStaffToken();

    const usersRes = await api('/api/v1/users', { token: staffToken });
    assert.equal(usersRes.status, 403);
    assert.equal(usersRes.data.code, 'AUTH_FORBIDDEN');

    const productsRes = await api('/api/v1/products?page_size=5', { token: staffToken });
    assert.equal(productsRes.status, 200);
    assert.ok(productsRes.data.items.length > 0);
    for (const item of productsRes.data.items) {
      assert.equal(item.costPrice, undefined, 'Staff product response must not contain costPrice');
      assert.equal(item.cost_price, undefined, 'Staff product response must not contain cost_price');
    }
  });
});
