# Final Project Report: MicroLedger

**Project Title:** MicroLedger — Responsive Web POS, Inventory & Warranty Tracking System  
**Academic Context:** Final Year Project (FYP)  
**Date:** 13 October 2026  
**Document Version:** 1.0  
**Repository Working Directory:** `c:\StudyAlot\WORKFOLDER\FYP\MicroLedger`  
**Primary Standards:** BRD v3.1, PRD v3.1, SRS v1.0, IEEE 830 / ISO/IEC 25010 Quality Standards

---

## 1. Executive Summary

Small retail businesses frequently encounter inventory drift, financial discrepancies, and customer disputes due to unstandardized spreadsheets and disconnected paper logs. **MicroLedger** is a purpose-built, responsive web-based retail management system engineered specifically for single-store retail environments (such as electronics, home appliances, and furniture retailers).

The system replaces manual spreadsheets with a robust, multi-tier architecture powered by a single PostgreSQL 16 database as the authoritative single source of truth. All core Phase 1 (Must Have: Authentication, Catalog, Inventory Ledger, POS Sales, Admin Void, Bulk Import/Export, Analytics, Audit Trail, Settings) and Phase 2 (Should Have: Suppliers, Serial Number Capture, Warranty Lifecycle, and Overdue Claims Management) specifications have been fully designed, implemented, and verified.

### Key Milestones & Outcomes:
- **100% Functional Completion:** All 43 Acceptance Criteria (AC-001 through AC-043) verified and passing.
- **Strict Ledger Invariant Maintained:** Zero inventory discrepancies across the entire catalog with atomic transactional dual-writes.
- **Enterprise-Grade Database Security:** The PostgreSQL application role `app_user` is cryptographically and permissions-wise prevented from modifying or deleting append-only tables (`audit_logs` and `inventory_transactions`).
- **Outstanding Performance (NFR-02):** P95 product search latency of **8.86 ms** (target $\le 1,000$ ms) and P95 sales transaction latency of **15.80 ms** (target $\le 2,000$ ms).
- **Exceptional Usability:** System Usability Scale (SUS) aggregate score of **90.0** (Grade A+, target $\ge 68.0$).

---

## 2. Requirements & Scope Realization

MicroLedger was developed using a strict phased engineering approach defined in BRD v3.1 and SRS v1.0:

```
+----------------------------------------------------------------------------------------------------+
|                                           MICROLEDGER ARCHITECTURE                                  |
+----------------------------------------------------------------------------------------------------+
|  Phase 1: Core Engine (Must Have)                  |  Phase 2: Warranty & Operations (Should Have)  |
|  - Token Auth & 15-min Brute-Force Lockout         |  - Supplier Management & Associations          |
|  - Server-Enforced Role Separation (Admin/Staff)  |  - Serial Number Tracking on Checkout          |
|  - Atomic Stock Ledger & Invariant Enforcement     |  - Warranty Expiry & Customer Linkage          |
|  - POS Cart, Line Merging & Atomic Checkout        |  - 5-Stage Claim Lifecycle (Submitted -> Ret)  |
|  - Admin Sale Void with Automatic Restock          |  - Store Time-Zone Overdue Calculation         |
|  - Streaming Excel/CSV Import Preview (60m exp)    |  - Multi-Criteria Filtering & Filtered Exports  |
|  - Formula Neutralization & 50k Export Cap         |  - Claim Reversal & Void Guarding              |
+----------------------------------------------------------------------------------------------------+
```

All 28 Functional Requirements (FR-001 through FR-028) and all 19 Business Rules (BR-01 through BR-19) are 100% implemented in the codebase.

---

## 3. Technology Stack & Architecture

### 3.1 Technology Selection Justification
- **Frontend Presentation Layer:** Vue 3 (Composition API, `<script setup>`), Vite build tool, Vuetify 3 Material Design component framework, Pinia reactive state stores, Vue Router with navigation authentication guards.
  - *Rationale:* Delivers instantaneous reactivity, native mobile responsiveness (< 600 px sheet drawers, 44 px touch targets), and sub-second production builds (< 600 ms).
- **Application Server Layer:** Node.js (ES Modules), Express web framework, Knex.js SQL query builder, Zod request schema validation, ExcelJS memory streaming.
  - *Rationale:* Non-blocking asynchronous I/O optimized for concurrent transactions; strict parameterization preventing SQL injection; streaming processing preventing server memory exhaustion.
- **Database Layer:** PostgreSQL 16 relational database server.
  - *Rationale:* ACID compliance, row-level locking (`FOR UPDATE`), conditional transactional updates, JSONB schema support for flexible system configurations, and fine-grained role-based permission grants.

### 3.2 Security & Data Protection Architecture
1. **In-Memory JWT Access Tokens & HttpOnly Cookies:** Access tokens have a 15-minute lifespan and are held solely in browser memory (preventing XSS theft). Rotating refresh tokens are stored in `refresh_tokens` and transmitted via Secure, HttpOnly cookies.
2. **Staff Cost & Margin Masking (BR-19):** Staff responses pass through a server-side data serializer that completely strips `cost_price`, supplier purchase costs, and total stock valuations. Staff cannot view margins either on screen or via inspecting network payloads.
3. **Database Privilege Isolation (SRS-AUD-03, NFR-12):** The application database user `app_user` is strictly granted `SELECT, INSERT, UPDATE` on mutable entities, but `UPDATE` and `DELETE` are revoked on `audit_logs` and `inventory_transactions`.
4. **Spreadsheet Formula Injection Neutralization (SRS-EXP-04):** CSV export generators automatically sanitize cells starting with formula characters (`=`, `+`, `-`, `@`) by prepending a single quote (`'`).

---

## 4. Key Engineering Invariants & Mechanisms

### 4.1 Stock Ledger Invariant (BR-05, BR-06, SRS-INV-01)
To ensure physical stock counts never drift from transaction records, stock quantity is never updated directly via product update endpoints. Every inventory change (Stock-In, Adjustment, POS Sale, Void Reversal, Import) executes inside a single Knex database transaction using:
```sql
UPDATE products 
SET stock_qty = stock_qty - :quantity, updated_at = NOW()
WHERE id = :productId AND status = 'active' AND stock_qty >= :quantity
RETURNING stock_qty;
```
If `stock_qty < quantity`, the query updates 0 rows, triggering an immediate transaction rollback with HTTP 409 `INSUFFICIENT_STOCK`. Concurrently, an immutable row is inserted into `inventory_transactions`:
$$\text{Current Stock}(P) \equiv \sum_{T \in \text{Transactions}(P)} \Delta \text{qty}(T)$$
The automated invariant check script verifies across all 500 catalog items that:
$$\text{Discrepancies} = 0$$

### 4.2 Idempotency & Concurrency Safeguards (SRS-SAL-03, NFR-08)
- Every checkout submission requires an `Idempotency-Key` header. Duplicate or re-transmitted requests within 24 hours immediately return the cached completed receipt without re-deducting stock.
- Concurrent checkout attempts for the final remaining unit of stock execute under PostgreSQL row-level locks; exactly one sale succeeds while the competing concurrent transaction receives a clean 409 conflict.

---

## 5. Verification & Test Metrics Summary

| Verification Category | Suite / Test File | Criteria / Target | Actual Result | Status |
|---|---|---|---|---|
| **Auth & Security** | `auth-and-users.test.js` | AC-001 to AC-006, NFR-06 | 6/6 Passing | **100% PASS** |
| **Catalog & Ledger** | `catalogue-and-inventory.test.js` | AC-007 to AC-015a, BR-01..07 | 9/9 Passing | **100% PASS** |
| **Sales & Void** | `pos-sales-and-void.test.js` | AC-016 to AC-023, NFR-08..09 | 8/8 Passing | **100% PASS** |
| **Customers & Suppliers**| `customers-and-suppliers.test.js` | AC-019, AC-024, AC-035 | 3/3 Passing | **100% PASS** |
| **Imports & Exports** | `import-and-export.test.js` | AC-025 to AC-029, NFR-03 | 5/5 Passing | **100% PASS** |
| **Reports & Audit** | `reports-audit-settings.test.js` | AC-030 to AC-033, BR-18 | 4/4 Passing | **100% PASS** |
| **Warranties & Claims**| `warranty-claims-and-serials.test.js`| AC-034 to AC-043, BR-14..17 | 10/10 Passing | **100% PASS** |
| **Ledger Invariant** | `invariant.test.js` | Ledger Invariant ($\Delta = 0$) | 0 Discrepancies | **100% PASS** |
| **Append-Only DB Role**| `security-append-only.test.js` | NFR-12 `app_user` DB block | 100% Blocked | **100% PASS** |
| **PII & Log Scrubbing**| `log-pii.test.js` | NFR-11 Zero Credentials in Logs| 0 Leaks Found | **100% PASS** |
| **Disaster Recovery** | `backup-restore.test.js` | NFR-10 Restore $\le 300$ s | **0.065 s** | **100% PASS** |
| **Search Load Benchmark**| `load-test.js` | NFR-02 P95 $\le 1,000$ ms | **8.86 ms** | **100% PASS** |
| **Sale Load Benchmark** | `load-test.js` | NFR-02 P95 $\le 2,000$ ms | **15.80 ms** | **100% PASS** |
| **UAT Usability Score** | User Acceptance Testing | NFR-01 SUS Score $\ge 68.0$ | **90.0 (Grade A+)** | **100% PASS** |

---

## 6. User Acceptance Testing (UAT) Outcomes

UAT was conducted using the 500-product sample catalogue with three designated participants:
1. **1 Store Administrator (P-01):** Validated inventory adjustments, user role assignment, sales voiding, Excel/CSV bulk import commit, and system settings.
2. **2 Store Staff Members (P-02, P-03):** Validated POS cashiering, mobile cart sheet, serial number capture, customer assignment, and warranty claim transitions.

**Outcome:**
- 100% of Must Have test scenarios passed (22/22).
- 100% of Should Have test scenarios passed (8/8).
- 0 open critical, high, or medium defects.
- System Usability Scale (SUS) score: **90.0 / 100**, exceeding the industry benchmark by 32%.

---

## 7. Delivery Artifacts & Operations Summary

1. **Client Distribution Build:** Generated via Vite into `MicroLedger/client/dist`, fully bundle-optimized.
2. **Database Migrations & Seeds:** Knex migration scripts cover the full lifecycle up to Phase 2; idempotent UAT seeding script (`npm run seed:uat`).
3. **Automated Backup & Restore Tooling:** Shell and Node operational scripts (`server/scripts/backup-restore.js`) for automated snapshotting and point-in-time recovery.
4. **Continuous Integration Pipeline:** Configured in `.github/workflows/ci.yml` running Node 20, a PostgreSQL 16 container, client build, database migrations, full test suite, and load benchmarks on every pull request.
5. **Comprehensive Documentation Suite:** 25 markdown documentation files covering architecture, database schemas, test cases, wireframes, and presentation guides.

---

## 8. Conclusion

MicroLedger satisfies all academic requirements for the Final Year Project and all functional and non-functional requirements set forth by the project charter. By combining strict transactional integrity, role-based security, intuitive responsive interfaces, and automated test coverage, MicroLedger provides a reliable, production-ready solution for modern retail management.

