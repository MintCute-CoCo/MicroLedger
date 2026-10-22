# Task Backlog

Size: **S** ≤ 0.5 day · **M** ≈ 1–2 days · **L** ≈ 3–4 days. Status values: Todo · Doing · Done. Priority follows the BRD (Must / Should). Requirement IDs refer to `docs/requirements/SRS.md`. E0–E12 are the original planned work and retain their recorded statuses. The project audit below is a static review of repository files; it did not execute CI, tests, UAT, or a production deployment. Therefore, recorded Done statuses and historical verification claims still need current run evidence at the final release gate.

## E0 — Setup (Sprint Setup)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-001 | Create repo, folder layout (client, server, docs), README | S | Must | | — | Done |
| T-002 | Linting, formatting, commit hooks | S | Must | T-001 | NFR-13 | Done |
| T-003 | Server skeleton: Express, config from env, error handler, health endpoint | M | Must | T-001 | — | Done |
| T-004 | Client skeleton: Vue 3, Vite, router, Pinia, Vuetify, API client | M | Must | T-001 | — | Done |
| T-005 | Local and staging PostgreSQL; Knex setup; migration runner | M | Must | T-003 | — | Done |
| T-006 | Migrations for all Phase 1 tables (`../architecture/DATABASE_DESIGN.md`) | L | Must | T-005 | §5 | Done |
| T-007 | App database role with append-only grants | S | Must | T-006 | SRS-AUD-03 | Done |
| T-008 | Seed script: first Admin from env, default settings | S | Must | T-006 | SRS-AUTH-11 | Done |
| T-009 | CI pipeline: lint, tests against a PostgreSQL service | M | Must | T-002, T-005 | NFR-13 | Done |
| T-010 | Test helpers: test database reset, factories, auth helper | M | Must | T-006 | — | Done |

## E1 — Authentication, users, settings (S1)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-011 | Password hashing and policy | S | Must | T-006 | SRS-AUTH-10 | Done |
| T-012 | Login with lockout and generic error | M | Must | T-011 | SRS-AUTH-01, 03, 04 | Done |
| T-013 | Access token and rotating refresh cookie; logout | M | Must | T-012 | SRS-AUTH-02, 05, 06 | Done |
| T-014 | Auth middleware: load user, status check, revoke on deactivation | M | Must | T-013 | SRS-AUTH-07 | Done |
| T-015 | Role middleware; per-endpoint roles; Staff serializer without cost data | M | Must | T-014 | SRS-AUTH-08, 09 | Done |
| T-016 | Users API: create, role change, deactivate, reset password, last-Admin guard | L | Must | T-015 | SRS-USR-01 to 04 | Done |
| T-017 | Change own password; forced change at first login | S | Must | T-013 | SRS-USR-05 | Done |
| T-018 | Rate limiting (login 10/min, others 300/min) | S | Must | T-003 | §4.2 | Done |
| T-019 | Settings API (currency, decimals, time zone) with audit | M | Must | T-015 | SRS-SET-01 | Done |
| T-020 | Audit writer utility (same-transaction) | M | Must | T-006 | SRS-AUD-01, 02, 05 | Done |
| T-021 | Client: login screen, auth store, route guards, session expiry handling | L | Must | T-004, T-013 | SRS-UI-06 | Done |
| T-022 | Client: users screen, settings screen, change password | M | Must | T-016, T-019 | FR-024 | Done |
| T-023 | Tests: auth, lockout, roles on every endpoint | L | Must | T-016 | NFR-06 | Done |

## E2 — Categories and products (S2)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-024 | Categories API with uniqueness and deactivate rule | M | Must | T-015 | SRS-CAT-01, 02 | Done |
| T-025 | Products API: create, update, deactivate, reactivate guard | L | Must | T-024 | SRS-PRD-01 to 05 | Done |
| T-026 | Product search, filters, sort, pagination; POS ranked lookup | M | Must | T-025 | SRS-PRD-06, 07 | Done |
| T-027 | Price-change audit with old and new values | S | Must | T-025, T-020 | SRS-PRD-04 | Done |
| T-028 | Client: categories and products screens, product form | L | Must | T-025 | FR-003, FR-004 | Done |
| T-029 | Tests: SKU uniqueness (case and spaces), defaults, stock not editable | M | Must | T-025 | BR-01 | Done |

## E3 — Inventory (S2)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-030 | Ledger writer: stock change + ledger row in one transaction | M | Must | T-006 | SRS-INV-01 | Done |
| T-031 | Opening stock on product create | S | Must | T-030, T-025 | SRS-PRD-01 | Done |
| T-032 | Stock-in endpoint | S | Must | T-030 | SRS-INV-03 | Done |
| T-033 | Adjustment endpoint with row lock, reason, no negative | M | Must | T-030 | SRS-INV-04 | Done |
| T-034 | Movement history and inventory list (Staff without cost) | M | Must | T-030 | SRS-INV-05, 06 | Done |
| T-035 | Invariant check query and test helper | S | Must | T-030 | SRS-INV-02 | Done |
| T-036 | Client: inventory screen, stock-in and adjust dialogs | M | Must | T-032, T-033 | FR-006 to 008 | Done |

## E4 — Customers (S3)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-037 | Customers API: create, update, search, duplicate-phone warning | M | Must | T-015 | SRS-CUS-01 to 04 | Done |
| T-038 | Client: customers screen and customer picker | M | Must | T-037 | FR-013 | Done |

## E5 — POS, sales, void (S3)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-039 | Sale request validation (merge lines, limits, discount, payment) | M | Must | T-026 | SRS-SAL-01, 02, 05 | Done |
| T-040 | Sale transaction per §3.12.1 with conditional stock update | L | Must | T-030, T-039 | SRS-SAL-04, 07, 08 | Done |
| T-041 | Idempotency-Key handling | M | Must | T-040 | SRS-SAL-03 | Done |
| T-042 | Sale number sequence; sale audit entry | S | Must | T-040, T-020 | SRS-SAL-06, 09 | Done |
| T-043 | Sales history API with filters; Staff without cost | M | Must | T-040 | SRS-SAL-11 | Done |
| T-044 | Void transaction per §3.12.2 | L | Must | T-040 | SRS-VOID-01 to 04, 06 | Done |
| T-045 | Client: POS screen (desktop and mobile cart sheet) | L | Must | T-026, T-040 | SRS-SAL-10 | Done |
| T-046 | Client: sales history and detail, void dialog | M | Must | T-043, T-044 | FR-012, FR-025 | Done |
| T-047 | Concurrency test (two sales, last unit); rollback test; idempotency test | L | Must | T-041 | NFR-08, NFR-09 | Done |
| T-048 | End-to-end test: full sale at 360 px | M | Must | T-045 | NFR-04 | Done |

## E6 — Import and export (S4)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-049 | Template files (.xlsx, .csv) and download endpoint | S | Must | T-025 | SRS-IMP-09 | Done |
| T-050 | Upload endpoint with type, signature and size checks | M | Must | T-015 | SRS-IMP-01 | Done |
| T-051 | Streaming parse (ExcelJS), header matching, column mapping | L | Must | T-050 | SRS-IMP-02 | Done |
| T-052 | Row validation and classification (new/update/error/warning) | L | Must | T-051 | SRS-IMP-03 | Done |
| T-053 | Preview storage, expiry, error report CSV | M | Must | T-052 | SRS-IMP-04 | Done |
| T-054 | Commit transaction (all / valid_only), SKU re-check, opening stock, no stock overwrite | L | Must | T-053, T-030 | SRS-IMP-05 to 08, 10 | Done |
| T-055 | Export endpoints (xlsx/csv), BOM, formula neutralisation, 50,000-row limit, audit | L | Must | T-043 | SRS-EXP-01 to 05 | Done |
| T-056 | Client: import wizard with preview and error table | L | Must | T-053 | FR-016, FR-017 | Done |
| T-057 | Client: export buttons | S | Must | T-055 | FR-018 | Done |
| T-058 | Test sets: valid 500 rows, 10 bad rows, 5,000 rows, oversized, wrong type, conflicts | L | Must | T-054 | NFR-03 | Done |

## E7 — Dashboard, reports, audit (S5)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-059 | Dashboard API (today, 7-day, top 5, stock value for Admin) | M | Must | T-043 | SRS-RPT-01 | Done |
| T-060 | Sales and inventory report APIs with grouping | L | Must | T-043 | SRS-RPT-02, 03 | Done |
| T-061 | Time-zone-aware date boundaries; screen vs export consistency test | M | Must | T-059, T-055 | SRS-RPT-05 | Done |
| T-062 | Audit log API and screen | M | Must | T-020 | SRS-AUD-04 | Done |
| T-063 | Client: dashboard and reports screens | L | Must | T-059, T-060 | FR-014 | Done |

## E8 — Phase 1 hardening (S5)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-064 | Role test on every endpoint (as Staff and unauthenticated) | M | Must | T-063 | NFR-06 | Done |
| T-065 | Backup job and restore drill with timing | M | Must | T-005 | NFR-10 | Done |
| T-066 | Append-only test (UPDATE/DELETE as app role must fail) | S | Must | T-007 | NFR-12 | Done |
| T-067 | Log inspection: no personal data | S | Must | T-063 | NFR-11 | Done |
| T-068 | Phase 1 acceptance run (AC-001 to AC-033) and status update | M | Must | all above | M1 | Done |

## E9 — Low stock and suppliers (S6)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-069 | Low-stock flag in lists, POS, dashboard, filter | M | Should | T-034 | SRS-LOW-01 | Done |
| T-070 | Suppliers API and screen | M | Should | T-015 | SRS-SUP-01 | Done |

## E10 — Warranty and claims (S6–S7)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-071 | Phase 2 migrations (warranties, claims, history, serials, suppliers) | M | Should | T-006 | §5 | Done |
| T-072 | Warranty creation inside the sale transaction; expiry calculation | M | Should | T-040, T-071 | SRS-WAR-01, 02 | Done |
| T-073 | Warranty search and validity; attach customer; manual warranty | M | Should | T-072 | SRS-WAR-03 to 06 | Done |
| T-074 | Claim create with warranty and customer rules | M | Should | T-073 | SRS-CLM-01, 02 | Done |
| T-075 | Transition endpoint: allowed transitions, required data, date rules | L | Should | T-074 | SRS-CLM-03 to 05, 08 | Done |
| T-076 | Status history and audit in same transaction | S | Should | T-075 | SRS-CLM-06 | Done |
| T-077 | Overdue and days-away calculation in queries | S | Should | T-075 | SRS-CLM-07 | Done |
| T-078 | Void guards: active claims, voided-sale warranties, serial release | M | Should | T-044, T-074 | SRS-VOID-05 | Done |
| T-079 | Client: warranty search, claim create, claim detail with actions | L | Should | T-075 | FR-022, FR-023 | Done |
| T-080 | Tests: expiry month-end, transitions, overdue, required fields | L | Should | T-077 | BR-14 to BR-17 | Done |

## E11 — Serials, filtering, warranty report (S7)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-081 | Serial capture at sale; uniqueness; release on void | M | Should | T-072 | SRS-SER-01, 02 | Done |
| T-082 | Combined filters for products, sales, claims; export uses same filters | L | Should | T-055, T-075 | SRS-FLT-01, SRS-CLM-09 | Done |
| T-083 | Warranty report API and screen | M | Should | T-077 | SRS-RPT-04 | Done |
| T-084 | Phase 2 acceptance run (AC-034 to AC-043) | M | Should | all above | M2 | Done |

## E12 — UAT and delivery

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-085 | Seed 500+ product dataset for UAT; staging pre-warm or always-on plan | M | Must | O-04 | BRD §12 | Done |
| T-086 | Load test (10,000 products, 5 users) against NFR-02 | M | Must | T-085 | NFR-02 | Done |
| T-087 | UAT script, test cases, SUS questionnaire | M | Must | T-068 | NFR-01 | Done |
| T-088 | Run UAT (1 Admin, 2 Staff); log defects | L | Must | T-087 | BRD §12 | Done |
| T-089 | Fix critical and high defects; retest | L | Must | T-088 | M3 | Done |
| T-090 | Sync BRD/PRD with SRS Appendix A; final documents | M | Must | | — | Done |
| T-091 | Final report, demo script and rehearsal | L | Must | T-089 | M4 | Done |

## E13 — Frontend Component Refactoring & UI Quality

These enhancements decomposed monolithic views into encapsulated subcomponents and composables per academic FYP readability standards.

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-092 | Split complex views into feature sections/dialogs and move page state/API logic into composables | L | Should | T-004 | — (maintainability) | Done |
| T-093 | Standardize panel alignment, typography, borders, and responsive layouts across views | L | Should | T-004 | — (UI consistency) | Done |
| T-094 | Refine POS density, cart scrolling, quantity controls, and fixed checkout visibility | M | Should | T-045 | — (POS usability) | Done |
| T-095 | Keep POS loading/error/empty states compact and prevent checkout overlap | S | Should | T-045 | — (POS usability) | Done |
| T-101 | Generate sale idempotency UUIDs on HTTP LAN origins and ensure UUID-generation errors release checkout busy state | S | Must | T-045 | SRS-SAL-03 | Done |
| T-102 | Split the global stylesheet into clearly named shared, layout, authentication, responsive, and panel-owned CSS files | M | Should | T-092, T-093 | — (maintainability) | Done |
| T-103 | Separate sale commit success from follow-up catalog/customer refresh failures; always release checkout busy state | M | Must | T-045 | SRS-SAL-03, 04 | Done |
| T-104 | Add bounded, actionable handling for stalled API requests across client flows; prevent stale POS searches replacing newer results | M | Should | T-098 | NFR-03, NFR-04 | Done |
| T-105 | Surface customer-list load failures in POS instead of silently presenting an empty customer picker | S | Should | T-045 | SRS-CUS-03 | Done |
| T-106 | Reuse the same idempotency key when retrying an unchanged sale payload after an uncertain network result | S | Must | T-041, T-104 | SRS-SAL-03 | Done |
| T-109 | Fix the dashboard 7-day sales chart so bars render visibly with dynamic labels | S | Should | T-092 | Dashboard snapshot | Done |
| T-110 | Keep product, customer, and inventory movement form validation in dialog components | M | Must | T-092 | SRS-PRD-01, SRS-CUS-01, SRS-INV-03, SRS-INV-04 | Done |
| T-111 | Surface claims list request failures and load independent dashboard and inventory sections | M | Should | T-092 | NFR-03, NFR-04 | Done |

## E14 — Backend Integration & Deployment Staging (Subsequent Phase)

These items govern the subsequent backend repository release and full-stack hosting deployment.

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|---|---|---|---|---|
| T-096 | Configure server environment variables and automated benchmark verification | M | Must | T-009 | NFR-02, NFR-13 | Done |
| T-097 | Enforce rate limiting in production mode while maintaining isolated test mocks | S | Must | T-018 | SRS-AUTH-03, NFR-06 | Done |
| T-098 | Browser smoke validation across mobile, tablet, and desktop viewports | L | Should | T-092–T-095 | NFR-04 | Staged |
| T-099 | Production deployment verification: HTTPS, CORS origin whitelist, and secure cookie transport | M | Must | T-065, T-096 | NFR-10, NFR-13 | Staged |
| T-100 | Full-stack CI execution and final defense release sign-off | M | Must | T-096–T-099 | M4 | Staged |
| T-107 | Automated regression coverage verifying rate-limiting headers in production mode | M | Must | T-097 | SRS-AUTH-03, NFR-06 | Staged |
| T-108 | Final CSS deduplication and Vuetify override optimization review | M | Should | T-102 | — (maintainability) | Staged |
