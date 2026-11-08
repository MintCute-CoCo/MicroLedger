import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { api, closeKnex, getAdminToken } from './helpers.js';
import { errorHandler } from '../src/middleware/error-handler.js';

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

  it('Actively intercepts server stdout/stderr logs and verifies zero passwords, tokens, or customer PII are logged', async () => {
    const loggedChunks = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    // Intercept console streams
    console.log = (...args) => {
      loggedChunks.push(args.map(String).join(' '));
      originalConsoleLog.apply(console, args);
    };
    console.error = (...args) => {
      loggedChunks.push(args.map(String).join(' '));
      originalConsoleError.apply(console, args);
    };

    try {
      // 1. Password probing on login
      const secretProbe = 'probeSecretPwd_98765';
      await api('/api/v1/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: secretProbe },
      });

      // 2. Customer operations probing (names, phone numbers, addresses, tokens)
      const adminToken = await getAdminToken();
      const customerPhone = '0987654321';
      const customerName = 'Nguyen Van Sensitive';
      await api('/api/v1/customers', {
        method: 'POST',
        token: adminToken,
        body: {
          name: customerName,
          phone: customerPhone,
          address: '456 Confidential Ave',
        },
      });

      // 3. Customer directory query
      await api(`/api/v1/customers?search=${customerPhone}`, {
        token: adminToken,
      });

      // 4. Server-error path: simulate 500 error containing sensitive DB URI and JWT
      const mockDbSecret = 'supersecretpass123';
      const mockDbUrl = `postgres://app_user:${mockDbSecret}@localhost:5432/microledger_prod`;
      const mockSensitiveError = new Error(`Connection failed for target: ${mockDbUrl}`);
      mockSensitiveError.stack = `Error: Connection failed for target: ${mockDbUrl}\n    at connect (file:///fake/path.js:10:5)\n    token: ${adminToken}`;
      const mockRes = {
        headersSent: false,
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.body = payload;
          return this;
        },
      };
      errorHandler(mockSensitiveError, {}, mockRes, () => {});

      const joinedLogs = loggedChunks.join('\n');
      assert.ok(!joinedLogs.includes(secretProbe), 'Console logs must never contain user submitted password');
      assert.ok(!joinedLogs.includes(customerPhone), 'Console logs must never leak customer phone numbers');
      assert.ok(!joinedLogs.includes(customerName), 'Console logs must never leak customer names');
      assert.ok(!joinedLogs.includes('password_hash'), 'Console logs must not leak password_hash keys');
      assert.ok(!joinedLogs.includes('postgres://app_user:supersecretpass123@'), 'Console logs must sanitize database auth credentials');
      assert.ok(!joinedLogs.includes(mockDbSecret), 'Console logs must never contain raw database passwords');
      assert.ok(!joinedLogs.includes(adminToken), 'Console logs must never leak authorization bearer tokens');
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  });
});

