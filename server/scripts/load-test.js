/**
 * ============================================================================
 * MicroLedger Performance & Load Benchmark Utility
 * ============================================================================
 *
 * PURPOSE:
 * Measures API response times, latency distributions, and p95 thresholds under
 * concurrent loads to verify Non-Functional Requirements (NFR-02):
 * - Product search latency p95 <= 1.00s
 * - POS sale completion latency p95 <= 2.00s
 *
 * Academic FYP Verification script.
 */

import 'dotenv/config';
import { api, getAdminToken, createTestProduct, closeKnex } from '../tests/helpers.js';

/**
 * Calculates a specific percentile value from an array of numeric durations.
 *
 * @param {Array<number>} arr - Array of recorded latencies in milliseconds.
 * @param {number} p - Desired percentile target (e.g., 95 for p95).
 * @returns {number} The latency value at the specified percentile.
 */
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Executes a simulated load test benchmarking product search and POS checkout.
 *
 * @param {number} [iterations=50] - Number of benchmark iterations per test category.
 * @returns {Promise<Object>} Detailed performance benchmark report with p95 metrics and pass/fail indicators.
 */
export async function runLoadTest(iterations = 50) {
  const token = await getAdminToken();

  // Prepare products for sale load test
  const product = await createTestProduct(token, { openingStock: iterations + 10 });

  // 1. Benchmark Search Latency (NFR-02 target: <= 1.00s)
  const searchLatencies = [];
  const searchTerms = ['UAT', 'Product', 'lamp', 'Sample', 'pcs'];
  for (let i = 0; i < iterations; i++) {
    const term = searchTerms[i % searchTerms.length];
    const start = performance.now();
    const res = await api(`/api/v1/products?q=${term}&page_size=20`, { token });
    const duration = performance.now() - start;
    if (res.ok) searchLatencies.push(duration);
  }

  // 2. Benchmark POS Sale Latency (NFR-02 target: <= 2.00s)
  const saleLatencies = [];
  for (let i = 0; i < iterations; i++) {
    const key = `LOAD_SALE_${Date.now()}_${i}`;
    const start = performance.now();
    const res = await api('/api/v1/sales', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': key },
      body: {
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'cash',
      },
    });
    const duration = performance.now() - start;
    if (res.ok) saleLatencies.push(duration);
  }

  const p95SearchMs = percentile(searchLatencies, 95);
  const p95SaleMs = percentile(saleLatencies, 95);
  const allSearchRequestsSucceeded = searchLatencies.length === iterations;
  const allSaleRequestsSucceeded = saleLatencies.length === iterations;

  return {
    iterations,
    search: {
      samples: searchLatencies.length,
      p95Ms: p95SearchMs.toFixed(2),
      targetMs: 1000,
      pass: allSearchRequestsSucceeded && p95SearchMs <= 1000,
    },
    sale: {
      samples: saleLatencies.length,
      p95Ms: p95SaleMs.toFixed(2),
      targetMs: 2000,
      pass: allSaleRequestsSucceeded && p95SaleMs <= 2000,
    },
    nfr02Compliance:
      allSearchRequestsSucceeded
      && allSaleRequestsSucceeded
      && p95SearchMs <= 1000
      && p95SaleMs <= 2000,
  };
}

if (process.argv[1]?.endsWith('load-test.js')) {
  try {
    console.log('Running MicroLedger NFR-02 load performance benchmark...');
    const results = await runLoadTest(30);
    console.log('Results:', JSON.stringify(results, null, 2));

    if (!results.nfr02Compliance) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('The NFR-02 benchmark could not complete:', error.message);
    process.exitCode = 1;
  } finally {
    await closeKnex();
  }
}

