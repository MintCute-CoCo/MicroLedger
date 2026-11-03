# Task Backlog

**Size Guide:** **S** ≤ 0.5 day · **M** ≈ 1–2 days · **L** ≈ 3–4 days.  
**Priority:** **Must** (Phase 1 Core) · **Should** (Phase 2 Warranty / Usability).  
**Status:** **Todo** · **Doing** · **Done** · **Staged**.  
Requirement references link directly to [`docs/requirements/SRS.md`](../requirements/SRS.md).

---

## Epic Progress Overview

| Epic | Description | Tasks | Progress | Status |
|---|---|:---:|:---:|:---:|
| **E0 — Setup** | Repository, build configs, database, CI skeleton | 10 | 10 / 10 | **Done** |
| **E1 — Auth & Users** | Login, JWT, lockout, users CRUD, settings, audit | 13 | 13 / 13 | **Done** |
| **E2 — Products** | Categories, products CRUD, search, price audit | 6 | 6 / 6 | **Done** |
| **E3 — Inventory** | Transactional ledger, stock-in, adjust, invariants | 7 | 7 / 7 | **Done** |
| **E4 — Customers** | Customer directory & POS customer selector | 2 | 2 / 2 | **Done** |
| **E5 — POS & Sales** | POS terminal, checkout, receipts, voids, idempotency | 10 | 10 / 10 | **Done** |
| **E6 — Import & Export** | Excel streaming parser, CSV export, formula safety | 10 | 10 / 10 | **Done** |
| **E7 — Reports & Audit** | Dashboard KPIs, sales reports, audit trail view | 5 | 5 / 5 | **Done** |
| **E8 — Hardening** | Append-only security, backup/restore, RBAC tests | 5 | 5 / 5 | **Done** |
| **E9 — Low Stock & Suppliers** | Low stock alerts, supplier directory | 2 | 2 / 2 | **Done** |
| **E10 — Warranty & Claims** | Warranty records, 7-stage RMA machine, overdue calc | 10 | 10 / 10 | **Done** |
| **E11 — Serials & Filtering** | Serial capture, unified multidimensional filters | 4 | 4 / 4 | **Done** |
| **E12 — UAT & Delivery** | 500-item catalog, SUS evaluation, final FYP report | 7 | 7 / 7 | **Done** |
| **E13 — Frontend Quality** | Composables, Vuetify primitives, demo mode, anti-slop | 17 | 17 / 17 | **Done** |
| **E14 — Backend Integration** | Express API, migrations, CI testing, deployment | 11 | 10 / 11 | **In Progress** |
| **Total** | **Full System Implementation Backlog** | **122** | **121 / 122** | **99% Complete** |

---

## E0 — Setup (Sprint Setup)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-001 | Project structure & README setup | S | Must | — | — | Done |
| T-002 | Linting, formatting & commit hooks | S | Must | T-001 | NFR-13 | Done |
| T-003 | Express skeleton & health check API | M | Must | T-001 | — | Done |
| T-004 | Client skeleton (Vue 3, Vite, Vuetify) | M | Must | T-001 | — | Done |
| T-005 | Local & staging PostgreSQL setup | M | Must | T-003 | — | Done |
| T-006 | Phase 1 Knex database migrations | L | Must | T-005 | §5 | Done |
| T-007 | Append-only app database role script | S | Must | T-006 | SRS-AUD-03 | Done |
| T-008 | Seed initial Admin user & store settings | S | Must | T-006 | SRS-AUTH-11 | Done |
| T-009 | CI pipeline with PostgreSQL service | M | Must | T-002, T-005 | NFR-13 | Done |
| T-010 | Test helpers, reset scripts & factories | M | Must | T-006 | — | Done |

---

## E1 — Authentication, Users & Settings (Sprint 1)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-011 | Password hashing policy (argon2id/bcrypt) | S | Must | T-006 | SRS-AUTH-10 | Done |
| T-012 | Login API with lockout & generic errors | M | Must | T-011 | SRS-AUTH-01 to 04 | Done |
| T-013 | JWT access token & rotating refresh cookie | M | Must | T-012 | SRS-AUTH-02, 05, 06 | Done |
| T-014 | Auth & active status middleware | M | Must | T-013 | SRS-AUTH-07 | Done |
| T-015 | RBAC middleware & Staff cost-masking | M | Must | T-014 | SRS-AUTH-08, 09 | Done |
| T-016 | Users CRUD API & last-Admin guard | L | Must | T-015 | SRS-USR-01 to 04 | Done |
| T-017 | Change password & forced first login | S | Must | T-013 | SRS-USR-05 | Done |
| T-018 | Rate limiting (login 10/min, api 300/min) | S | Must | T-003 | §4.2 | Done |
| T-019 | Store settings API & audit logging | M | Must | T-015 | SRS-SET-01 | Done |
| T-020 | Transactional audit writer helper | M | Must | T-006 | SRS-AUD-01, 02, 05 | Done |
| T-021 | Client login view & auth store | L | Must | T-004, T-013 | SRS-UI-06 | Done |
| T-022 | Client users & settings views | M | Must | T-016, T-019 | FR-024 | Done |
| T-023 | Automated auth & lockout test suite | L | Must | T-016 | NFR-06 | Done |

---

## E2 — Categories & Products (Sprint 2)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-024 | Categories CRUD & uniqueness API | M | Must | T-015 | SRS-CAT-01, 02 | Done |
| T-025 | Products CRUD & deactivate guard | L | Must | T-024 | SRS-PRD-01 to 05 | Done |
| T-026 | Product search, filters & POS lookup | M | Must | T-025 | SRS-PRD-06, 07 | Done |
| T-027 | Price-change audit trail recording | S | Must | T-025, T-020 | SRS-PRD-04 | Done |
| T-028 | Client products & categories views | L | Must | T-025 | FR-003, FR-004 | Done |
| T-029 | SKU uniqueness & immutability tests | M | Must | T-025 | BR-01 | Done |

---

## E3 — Inventory Ledger (Sprint 2)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-030 | Transactional inventory ledger writer | M | Must | T-006 | SRS-INV-01 | Done |
| T-031 | Opening stock on product creation | S | Must | T-030, T-025 | SRS-PRD-01 | Done |
| T-032 | Stock-in API endpoint | S | Must | T-030 | SRS-INV-03 | Done |
| T-033 | Stock adjustment API with reason | M | Must | T-030 | SRS-INV-04 | Done |
| T-034 | Movement history API (Staff cost-masked) | M | Must | T-030 | SRS-INV-05, 06 | Done |
| T-035 | Stock ledger invariant check helper | S | Must | T-030 | SRS-INV-02 | Done |
| T-036 | Client inventory view & dialogs | M | Must | T-032, T-033 | FR-006 to 008 | Done |

---

## E4 — Customers (Sprint 3)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-037 | Customers CRUD & duplicate-phone alert | M | Must | T-015 | SRS-CUS-01 to 04 | Done |
| T-038 | Client customers view & POS picker | M | Must | T-037 | FR-013 | Done |

---

## E5 — POS, Sales & Void (Sprint 3)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-039 | Sale validation & line item merging | M | Must | T-026 | SRS-SAL-01, 02, 05 | Done |
| T-040 | Atomic sale & stock update transaction | L | Must | T-030, T-039 | SRS-SAL-04, 07, 08 | Done |
| T-041 | Idempotency-Key request handling | M | Must | T-040 | SRS-SAL-03 | Done |
| T-042 | Sale number sequence (`S-000001`) | S | Must | T-040, T-020 | SRS-SAL-06, 09 | Done |
| T-043 | Sales history API (Staff cost-masked) | M | Must | T-040 | SRS-SAL-11 | Done |
| T-044 | Void transaction & stock restoration | L | Must | T-040 | SRS-VOID-01 to 06 | Done |
| T-045 | Client POS view & mobile cart sheet | L | Must | T-026, T-040 | SRS-SAL-10 | Done |
| T-046 | Client sales history & void dialog | M | Must | T-043, T-044 | FR-012, FR-025 | Done |
| T-047 | Concurrent sale & rollback tests | L | Must | T-041 | NFR-08, NFR-09 | Done |
| T-048 | Mobile 360 px checkout E2E test | M | Must | T-045 | NFR-04 | Done |

---

## E6 — Import & Export (Sprint 4)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-049 | Excel/CSV templates & download API | S | Must | T-025 | SRS-IMP-09 | Done |
| T-050 | File upload validation & size checks | M | Must | T-015 | SRS-IMP-01 | Done |
| T-051 | Streaming Excel parse & column mapping | L | Must | T-050 | SRS-IMP-02 | Done |
| T-052 | Row validation & classification | L | Must | T-051 | SRS-IMP-03 | Done |
| T-053 | Import preview & error report CSV | M | Must | T-052 | SRS-IMP-04 | Done |
| T-054 | Import commit transaction & guards | L | Must | T-053, T-030 | SRS-IMP-05 to 10 | Done |
| T-055 | Export API & formula neutralization | L | Must | T-043 | SRS-EXP-01 to 05 | Done |
| T-056 | Client import wizard & preview table | L | Must | T-053 | FR-016, FR-017 | Done |
| T-057 | Client export action buttons | S | Must | T-055 | FR-018 | Done |
| T-058 | Import/export dataset test suite | L | Must | T-054 | NFR-03 | Done |

---

## E7 — Dashboard, Reports & Audit (Sprint 5)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-059 | Dashboard KPI API (today & 7-day) | M | Must | T-043 | SRS-RPT-01 | Done |
| T-060 | Sales & inventory report APIs | L | Must | T-043 | SRS-RPT-02, 03 | Done |
| T-061 | Timezone-aware date boundaries (GMT+7) | M | Must | T-059, T-055 | SRS-RPT-05 | Done |
| T-062 | Audit log API & client view | M | Must | T-020 | SRS-AUD-04 | Done |
| T-063 | Client dashboard & sales report views | L | Must | T-059, T-060 | FR-014 | Done |

---

## E8 — Hardening & Verification (Sprint 5)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-064 | Endpoint role security test suite | M | Must | T-063 | NFR-06 | Done |
| T-065 | Database backup & restore drill | M | Must | T-005 | NFR-10 | Done |
| T-066 | Append-only permission tests | S | Must | T-007 | NFR-12 | Done |
| T-067 | Log inspection & PII masking tests | S | Must | T-063 | NFR-11 | Done |
| T-068 | Phase 1 acceptance run (AC-001 to AC-033) | M | Must | all above | M1 | Done |

---

## E9 — Low Stock & Suppliers (Sprint 6)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-069 | Low-stock indicator across UI & POS | M | Should | T-034 | SRS-LOW-01 | Done |
| T-070 | Suppliers CRUD API & client view | M | Should | T-015 | SRS-SUP-01 | Done |

---

## E10 — Warranty & RMA Claims (Sprints 6–7)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-071 | Phase 2 database schema migrations | M | Should | T-006 | §5 | Done |
| T-072 | Sale warranty creation & expiry calc | M | Should | T-040, T-071 | SRS-WAR-01, 02 | Done |
| T-073 | Warranty search & customer attachment | M | Should | T-072 | SRS-WAR-03 to 06 | Done |
| T-074 | RMA claim creation API | M | Should | T-073 | SRS-CLM-01, 02 | Done |
| T-075 | 7-stage claim state transition API | L | Should | T-074 | SRS-CLM-03 to 08 | Done |
| T-076 | Claim status history & audit logging | S | Should | T-075 | SRS-CLM-06 | Done |
| T-077 | Calculated overdue claim detection | S | Should | T-075 | SRS-CLM-07 | Done |
| T-078 | Void guards for active warranty claims | M | Should | T-044, T-074 | SRS-VOID-05 | Done |
| T-079 | Client warranty & claim detail views | L | Should | T-075 | FR-022, FR-023 | Done |
| T-080 | Warranty transition & date tests | L | Should | T-077 | BR-14 to BR-17 | Done |

---

## E11 — Serials & Advanced Filtering (Sprint 7)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-081 | Serial number capture & uniqueness | M | Should | T-072 | SRS-SER-01, 02 | Done |
| T-082 | Unified filters for catalog & claims | L | Should | T-055, T-075 | SRS-FLT-01, SRS-CLM-09 | Done |
| T-083 | Warranty report API & client view | M | Should | T-077 | SRS-RPT-04 | Done |
| T-084 | Phase 2 acceptance run (AC-034 to AC-043) | M | Should | all above | M2 | Done |

---

## E12 — UAT & Academic Delivery (Sprint 8)

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-085 | Seed 500+ PC hardware UAT catalog | M | Must | O-04 | BRD §12 | Done |
| T-086 | Load benchmark (10,000 items, 5 users) | M | Must | T-085 | NFR-02 | Done |
| T-087 | UAT scenarios & SUS questionnaire | M | Must | T-068 | NFR-01 | Done |
| T-088 | Execute UAT with 1 Admin & 2 Staff | L | Must | T-087 | BRD §12 | Done |
| T-089 | UAT defect remediation & retest | L | Must | T-088 | M3 | Done |
| T-090 | PRD/BRD & SRS Appendix alignment | M | Must | — | — | Done |
| T-091 | Final report & defense rehearsal | L | Must | T-089 | M4 | Done |

---

## E13 — Frontend Quality & Usability Polish

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-092 | Decompose views into composables & dialogs | L | Should | T-004 | Maintainability | Done |
| T-093 | Standardize layout alignment & typography | L | Should | T-004 | UI Consistency | Done |
| T-094 | Refine POS desktop 8:4 & mobile cart sheet | M | Should | T-045 | POS Usability | Done |
| T-095 | Compact POS empty & loading states | S | Should | T-045 | POS Usability | Done |
| T-101 | Handle sale idempotency on LAN origins | S | Must | T-045 | SRS-SAL-03 | Done |
| T-102 | Modularize global stylesheets by panel | M | Should | T-092 | Maintainability | Done |
| T-103 | Isolate sale commit from catalog refresh | M | Must | T-045 | SRS-SAL-03, 04 | Done |
| T-104 | Add request timeouts & abort stale searches | M | Should | T-098 | NFR-03, NFR-04 | Done |
| T-105 | Surface POS customer load errors | S | Should | T-045 | SRS-CUS-03 | Done |
| T-106 | Preserve idempotency key on sale retry | S | Must | T-041 | SRS-SAL-03 | Done |
| T-109 | Fix 7-day dashboard chart rendering | S | Should | T-092 | Dashboard | Done |
| T-110 | Encapsulate dialog form validations | M | Must | T-092 | SRS-PRD-01, SRS-INV-03 | Done |
| T-111 | Surface claims list request failures | M | Should | T-092 | NFR-03, NFR-04 | Done |
| T-112 | In-browser offline demo mode engine | M | Should | T-004 | Offline Demo | Done |
| T-113 | Anti-slop UI audit (tasteskill v2) | M | Should | T-093 | UI Design | Done |
| T-114 | Refactor ResponsiveTable to Vuetify primitives | M | Should | T-093 | Rule 15, §11 | Done |
| T-115 | Full-stack CI pipeline (Postgres 16) | M | Must | T-009 | NFR-13 | Done |
| T-116 | Interactive system explainer HTML | M | Should | T-004 | Defense Guide | Done |

---

## E14 — Backend Integration & Deployment Staging

| ID | Task | Size | Pri | Depends | Req | Status |
|---|---|:---:|:---:|---|---|:---:|
| T-096 | Server environment config & benchmarks | M | Must | T-009 | NFR-02, NFR-13 | Done |
| T-097 | Production rate-limiting & test mocks | S | Must | T-018 | SRS-AUTH-03 | Done |
| T-098 | Cross-device browser smoke tests | L | Should | T-092 | NFR-04 | Done |
| T-099 | Production deployment & HTTPS verification | M | Must | T-065 | NFR-10, NFR-13 | Staged |
| T-100 | Full-stack CI execution & release sign-off | M | Must | T-096 | M4 | Done |
| T-107 | Rate-limiting header regression tests | M | Must | T-097 | SRS-AUTH-03 | Done |
| T-108 | Final CSS deduplication & cleanup | M | Should | T-102 | Maintainability | Done |
| T-117 | Update vulnerable packages (body-parser, multer) | S | Must | T-096 | NFR-11 | Done |
| T-118 | Synchronize root README with full-stack v1.0 & benchmarks | S | Must | T-117 | NFR-13 | Done |
| T-119 | Printable thermal receipt modal & full-system diagrams portal | M | Must | T-118 | SRS-SAL-01, AC-016 | Done |
| T-120 | Single currency guardrails, format preview & safety dialog | S | Must | T-119 | SRS-SET-01, BSR §4.6 | Done |
| T-121 | Normalize receipt monetary cents parsing & fix double scaling | S | Must | T-119 | SRS-SAL-01, AC-016 | Done |
| T-122 | Configurable store address/phone on receipt & general domain docs | S | Must | T-121 | SRS-SET-01, BSR §4.6 | Done |
| T-123 | Decompose SettingsView into subcomponents & resolve taste-skill audit | S | Must | T-122 | SRS-SET-01, AGENTS.md | Done |
