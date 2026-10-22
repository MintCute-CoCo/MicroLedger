# PRD & SRS Alignment Document

**Document Version:** 1.0  
**Date:** 13 October 2026  
**Project:** MicroLedger (FYP)  
**Author:** FYP Development Team  
**Scope:** Traceability and formal alignment between Product Requirements Document (PRD v3.1), Business Requirements Document (BRD v3.1 / `../foundation/BSR.md`), and Software Requirements Specification (SRS v1.0).

---

## 1. Overview & Purpose

During the transition from business concepts (BRD v3.1) and user-centric specifications (PRD v3.1) to formal engineering requirements (SRS v1.0), 10 technical and architectural items were identified and formalized in SRS Appendix A (A-01 through A-10).

This document establishes full bidirectional traceability, verifying that every item added in SRS Appendix A is reconciled into the system design, database architecture, API contracts, security controls, and client UI.

---

## 2. Traceability Matrix: SRS Appendix A (A-01 to A-10)

| Item ID | SRS Specification | BRD/PRD Reference | Module & Architecture Realization | Verification Status |
|---|---|---|---|---|
| **A-01** | **Store Settings & Timezone Infrastructure:** Store currency and decimal formatting (`SRS-SET-01`). Application timezone (`Asia/Ho_Chi_Minh` / GMT+7) is managed at the infrastructure level via the Node.js Docker container's `TZ` environment variable. | BRD §4.1, PRD FR-024, Decision D-16 | `settings` table stores currency configuration. Container-level `TZ` environment variable governs date boundary logic for reports, sales history, and warranty overdue calculations. | Verified by AC-033 (`server/tests/reports-audit-settings.test.js`) |
| **A-02** | **Token & User Security Architecture:** `refresh_tokens` table, `must_change_password` flag, per-request role check, and 8–128 char password policy (`SRS-AUTH-02, 05, 07, 10; USR-01`). | PRD §3.1, BRD §4.1, Decision D-17 | In-memory access token, rotating HttpOnly cookie refresh token. Middleware checks user active status and role on every request. | Verified by AC-001, AC-003, AC-004, AC-005 (`server/tests/auth-and-users.test.js`) |
| **A-03** | **Streaming Import Preview & Expiry:** `import_logs` stores payload with `expires_at` (60 min expiry) (`SRS-IMP-01 to 08`). | PRD FR-016, FR-017, Decision D-18 | ExcelJS memory streaming. Import files are never written to disk. Preview rows classified into new/update/warning/error. | Verified by AC-025, AC-026, AC-027 (`server/tests/import-and-export.test.js`) |
| **A-04** | **Server-Enforced Sales Pricing & Limits:** Client never submits item price; server snapshots active `selling_price`. Maximum 100 lines per sale. `Idempotency-Key` required (`SRS-SAL-01, 03, 08`). | BRD BR-08, Decision D-19 | Price tampering is impossible. Transaction enforces atomic deduction `stock_qty = stock_qty - q WHERE stock_qty >= q`. Duplicate requests replay original sale receipt. | Verified by AC-016, AC-017, AC-018, AC-020, AC-021 (`server/tests/pos-sales-and-void.test.js`) |
| **A-05** | **Void Integrity & Claim Guard:** Sale with active (non-cancelled) claim cannot be voided; voiding releases serial numbers; warranties of voided sales cannot be claimed (`SRS-VOID-05, SRS-SER-01`). | PRD FR-025, Decision D-20 | Atomic void restores product inventory and writes ledger reversal. Checks `warranty_claims` for active status before allowing void. | Verified by AC-022, AC-023, AC-041 (`server/tests/pos-sales-and-void.test.js`, `server/tests/warranty-claims-and-serials.test.js`) |
| **A-06** | **Warranty Decoupling & Customer Attachment:** Warranties created per serial for serial-tracked products, or per sale item; customer is attached to warranty record, keeping sales immutable (`SRS-WAR-01, 06; SRS-SAL-12`). | PRD §7, Decision D-21 | Warranties generated automatically on sale or created manually by Admin. Allows customer assignment at claim time without mutating closed sales receipt. | Verified by AC-035, AC-036, AC-037 (`server/tests/warranty-claims-and-serials.test.js`) |
| **A-07** | **Export Safeguards & Formula Neutralization:** 50,000-row export cap; CSV exports prefix formula injection symbols (`=`, `+`, `-`, `@`) with a single quote (`'`) (`SRS-EXP-02, 04`). | PRD FR-018, Decision D-22 | Prevents memory exhaustion on Node.js runtime and spreadsheet code injection when CSV is opened in Excel. | Verified by AC-028, AC-029 (`server/tests/import-and-export.test.js`) |
| **A-08** | **Preservation of Business History:** Products and customers are deactivated, never hard-deleted (`SRS-PRD-05, SRS-CUS-04`). | PRD FR-003, FR-013, Decision D-23 | Soft-deactivation pattern preserves referential integrity with historic sales, ledger entries, and warranty records. | Verified by AC-008, AC-019 (`server/tests/catalogue-and-inventory.test.js`, `server/tests/customers-and-suppliers.test.js`) |
| **A-09** | **Append-Only Database Enforcement:** Database role `app_user` has `UPDATE` and `DELETE` revoked on `audit_logs` and `inventory_transactions` (`SRS-AUD-03`). | PRD §3.1, BRD §5, Decision D-24 | PostgreSQL database privilege level security guarantees tamper-proof audit trails even if application code is compromised. | Verified by AC-015a, NFR-12 (`server/tests/security-append-only.test.js`) |
| **A-10** | **Rate Limiting Security:** 10 requests/min on login, 300 requests/min per IP on general API endpoints (`SRS §4.2`). | PRD §8, Decision D-25 | `express-rate-limit` prevents brute-force credential stuffing and denial of service. Test bypass headers enabled only in test environment. | Verified by NFR-06 and unit/auth tests (`server/src/app.js`, `server/tests/auth-and-users.test.js`) |

---

## 3. Business Rule Traceability (BR-01 through BR-19)

| Rule ID | PRD Business Rule Summary | Implementation Mechanism | Test Reference |
|---|---|---|---|
| **BR-01** | Unique SKU among active products (trimmed, case-insensitive) | Knex unique constraint check + DB check | `catalogue-and-inventory.test.js` (AC-007) |
| **BR-02** | Categories unique among active categories; no deactivation if products assigned | Category validator and foreign check | `catalogue-and-inventory.test.js` (AC-007) |
| **BR-03** | Product creation defaults: stock 0, active, serial-tracked false, warranty 0 | Model creation default insertion | `catalogue-and-inventory.test.js` (AC-008) |
| **BR-04** | Stock quantity cannot be edited directly via product update | Stripped from PATCH schema | `catalogue-and-inventory.test.js` (AC-009) |
| **BR-05** | No negative stock allowed on any transaction | Conditional `UPDATE ... stock_qty >= q` | `catalogue-and-inventory.test.js` (AC-014) |
| **BR-06** | Stock movement ledger invariant: sum of changes equals current stock | Transactional dual-write (ledger + product) | `invariant.test.js` (AC-015) |
| **BR-07** | Stock adjustments require reason and lock row | Adjustment service row locking | `catalogue-and-inventory.test.js` (AC-013) |
| **BR-08** | POS prices must snapshot selling price from database, not client | Server ignores client price input | `pos-sales-and-void.test.js` (AC-017) |
| **BR-09** | POS lines merged by product_id; max discount cannot exceed total | Cart validator and merger | `pos-sales-and-void.test.js` (AC-016) |
| **BR-10** | Sale transaction atomic: stock deduction + sale + lines + ledger + audit | Knex database transaction block | `pos-sales-and-void.test.js` (AC-018) |
| **BR-11** | Idempotency-Key prevents double submissions | Key caching and replay logic | `pos-sales-and-void.test.js` (AC-021) |
| **BR-12** | Void requires Admin, restores stock, writes ledger and audit | Void service transaction | `pos-sales-and-void.test.js` (AC-022, AC-023) |
| **BR-13** | Customer phone warning on duplicate phone | Customer search service | `customers-and-suppliers.test.js` (AC-019) |
| **BR-14** | Warranty expiry calculated from sale date + warranty_months | Date boundary utility | `warranty-claims-and-serials.test.js` (AC-034) |
| **BR-15** | Warranty claims require customer with phone number | Claim creation validation | `warranty-claims-and-serials.test.js` (AC-037) |
| **BR-16** | Allowed claim status lifecycle transitions strictly validated | State machine validator in service | `warranty-claims-and-serials.test.js` (AC-038) |
| **BR-17** | Claim resolution required on completion; reason required on cancel/reject | State machine validator in service | `warranty-claims-and-serials.test.js` (AC-039, AC-040) |
| **BR-18** | Reports and overdue checks operate in configured store time zone | Infrastructure-level container `TZ` environment variable (`Asia/Ho_Chi_Minh` / GMT+7) | `reports-audit-settings.test.js` (AC-033) |
| **BR-19** | Staff role cannot view cost prices or margin calculations | Staff response serializer | `auth-and-users.test.js` (AC-006) |

---

## 4. Reporting Architecture: Dashboard vs. Sales Report Alignment

To ensure clear operational boundaries and prevent UI complexity:

1. **Dashboard Scope (`SRS-RPT-01`)**:
   - Strictly a static operational snapshot.
   - Presents Today's sales KPI (revenue, completed count), trailing 7-day sales breakdown, low-stock alerts, top-5 fast-moving products, and inventory valuation at cost (Admin only).
   - Contains **no** arbitrary date range pickers or multidimensional grouping controls.

2. **Sales Report Scope (`SRS-RPT-02`, `SRS-RPT-05`)**:
   - The dedicated analytical module for sales reporting (`/reports/sales`).
   - Supports dynamic date range filtering (From Date / To Date inputs defaulting to current month), dimensional grouping (by Day, Product, Category, User, Payment Method), and detailed export.
   - All date boundaries evaluate against the store timezone configured via the container's `TZ` environment variable.

---

## 5. Conclusion & Sign-Off

The PRD v3.1, BRD v3.1, and SRS v1.0 specifications are now in complete alignment with zero unresolved architectural gaps or contradictions. All 10 SRS Appendix A additions have been implemented, verified, and automated in the test suite.

