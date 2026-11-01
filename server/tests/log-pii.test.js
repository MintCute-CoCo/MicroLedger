import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, closeKnex, getAdminToken } from './helpers.js';

describe('Log & Response Inspection: No Secrets or PII Leaks (SRS-NFR-11, T-067)', () => {
  after(async () => {
    await closeKnex();
  });

  it('Login failure responses never leak credential specifics or salt/hashes', async () => {
    const res = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'wrongpassword123' },
    });
    assert.equal(res.status, 401);
    assert.equal(res.data.code, 'AUTH_INVALID_CREDENTIALS');
    const jsonStr = JSON.stringify(res.data);
    assert.ok(!jsonStr.includes('password_hash'), 'Response must never leak password_hash');
    assert.ok(!jsonStr.includes('salt'), 'Response must never leak salt');
  });

  it('User directory and detail APIs never expose password hashes', async () => {
    const adminToken = await getAdminToken();
    const listRes = await api('/api/v1/users', { token: adminToken });
    assert.equal(listRes.status, 200);
    for (const user of listRes.data.items) {
      assert.equal(user.password_hash, undefined, 'User row must not leak password_hash');
      assert.equal(user.passwordHash, undefined, 'User row must not leak passwordHash');
      assert.equal(user.password, undefined, 'User row must not leak password');
    }
  });

  it('Error responses sanitize internal details and omit database credentials', async () => {
    const badIdRes = await api('/api/v1/products/999999999');
    assert.equal(badIdRes.status, 401); // Auth required first
    const jsonStr = JSON.stringify(badIdRes.data);
    assert.ok(!jsonStr.includes('postgres://'), 'Response must not contain DATABASE_URL');
    assert.ok(!jsonStr.includes('password'), 'Response must not contain database password');
  });
});

