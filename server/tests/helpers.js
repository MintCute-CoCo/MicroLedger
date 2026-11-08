import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import knex from 'knex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 3000;
export const BASE_URL = `http://localhost:${PORT}`;

let _db = null;
export function getKnex() {
  if (!_db) {
    _db = knex({
      client: 'pg',
      connection: process.env.DATABASE_URL,
      pool: { min: 1, max: 5 },
    });
  }
  return _db;
}

export async function closeKnex() {
  if (_db) {
    await _db.destroy();
    _db = null;
  }
}

export async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  const reqHeaders = { 'x-test-suite': 'true', ...headers };
  if (token) reqHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    data,
    headers: res.headers,
  };
}

export async function login(username, password) {
  const res = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${username}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

export async function getAdminToken() {
  const auth = await login('admin', 'adminpassword123');
  return auth.accessToken;
}

export async function getStaffToken() {
  const auth = await login('minhanh', 'staffpassword123');
  return auth.accessToken;
}

export async function createTestCategory(token, name) {
  const catName = name || `Cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const res = await api('/api/v1/categories', {
    method: 'POST',
    token,
    body: { name: catName, description: 'Test category' },
  });
  return res.data;
}

export async function createTestProduct(token, overrides = {}) {
  const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let categoryId = overrides.categoryId;
  if (!categoryId) {
    const cat = await createTestCategory(token);
    categoryId = cat.id;
  }
  const payload = {
    sku: overrides.sku || `SKU_${rand}`,
    name: overrides.name || `Product ${rand}`,
    categoryId,
    unit: overrides.unit || 'pcs',
    sellingPrice: overrides.sellingPrice || '100.00',
    costPrice: overrides.costPrice || '50.00',
    openingStock: overrides.openingStock !== undefined ? overrides.openingStock : 10,
    reorderLevel: overrides.reorderLevel !== undefined ? overrides.reorderLevel : 5,
    warrantyMonths: overrides.warrantyMonths !== undefined ? overrides.warrantyMonths : 12,
    tracksSerial: overrides.tracksSerial || false,
    ...overrides,
  };
  const res = await api('/api/v1/products', {
    method: 'POST',
    token,
    body: payload,
  });
  if (!res.ok) {
    throw new Error(`Failed to create test product: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

export async function checkInvariant() {
  const db = getKnex();
  const mismatches = await db.raw(`
    SELECT p.id, p.sku, p.stock_qty, COALESCE(t.total, 0)::int AS ledger_total
    FROM products p
    LEFT JOIN (
      SELECT product_id, SUM(quantity_change) AS total
      FROM inventory_transactions
      GROUP BY product_id
    ) t ON t.product_id = p.id
    WHERE p.stock_qty <> COALESCE(t.total, 0)
  `);
  return mismatches.rows;
}
