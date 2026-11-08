# Project Status

**Last updated:** 8 November 2026 · **Current phase:** Full-Stack Integration & System Verification (v1.0-fullstack) · **Next milestone:** Final Defense Delivery & University Presentation (M4)

---

## 1. Executive Summary

MicroLedger's documented application scope—comprising the **Frontend Web Client (`client/`)**, **Backend Express 5 API (`server/`)**, **PostgreSQL 16 database**, and **Living Documentation Suite (`docs/`)**—is implemented and integrated. A comprehensive backend security and operations audit successfully resolved all data-safety, least-privilege, backup-recovery, production-hardening, dependency advisory, and evidence-accuracy tasks (T-129–T-134). Production cloud hosting and HTTPS verification remain staged for oral defense presentation (T-099).

Key milestones achieved in this release cycle:
1. **Full-Stack Integration:** The complete modular Express 5 API, Knex database migrations, authentic PC hardware seeds, append-only security role script (`create-app-role.js`), and 11 comprehensive automated test suites have been pushed to GitHub.
2. **Automated CI/CD Pipeline:** The GitHub Actions workflow (`.github/workflows/ci.yml`) provisions an Ubuntu runner with a live PostgreSQL 16 container, executing schema migrations, application role provisioning, seed population, and end-to-end API verification.
3. **API-Only Client:** Client mock/demo request handling and the standalone offline demo engine have been removed. The client now uses the Express API as required by the SRS; offline mode is out of scope (SRS §1.2).
4. **Anti-Slop & Design Taste (`tasteskill v2`):** The frontend was audited against the anti-slop design skill, establishing a calm, flat achromatic ledger palette (`#f5f7fb`, `#ffffff`, 1px borders `#d4dce8`), eliminating all resting drop shadows, removing radial gradients, replacing decorative emojis with `@mdi/font` icons, and clearing all `lint.mjs` failures (**0 FAIL, 32 WARN** across 137 client files).
5. **Universal Responsive Grid Refactoring:** The universal data table abstraction (`client/src/components/ResponsiveTable.vue`) has been refactored to rely exclusively on Vuetify 3 component primitives (`v-card`, `v-row`, `v-col`, `v-pagination`, `v-progress-linear`), eliminating custom CSS grids and non-standard `font-size: XXpx;` styles.

---

## 2. Active Deliverables Tracker

| Deliverable | Category | Status | Notes |
|---|---|:---:|---|
| **Universal Component Decomposition** | Frontend Architecture | **Done** | Decomposed all monolithic views into focused subcomponents (`components/`) and composables (`composables/`) per FYP academic coding standards. |
| **Vuetify 3 Primitives & Typography Standardization** | Frontend UI | **Done** | Replaced custom layout CSS with standard Vuetify 3 primitives (`v-container`, `v-row`, `v-col`, `v-card`, `ResponsiveTable`). Enforced universal typography (`text-h5`, `text-h6`, `text-overline`, `text-body-2`). |
| **ResponsiveTable Primitive Refactoring** | Frontend UI | **Done** | Refactored `ResponsiveTable.vue` into pure Vuetify 3 primitives (`v-card`, `v-row`, `v-col`), removing custom CSS layout grids and custom `font-size: XXpx;` rules. |
| **Anti-Slop & Design Taste (`tasteskill v2`)** | Frontend UI / Quality | **Done** | Achieved 0 FAIL in tasteskill linter: removed resting drop shadows, radial gradients, and decorative UI emojis. Adopted flat achromatic ledger design. |
| **API-Only Frontend Requests** | Frontend Architecture | **Done** | Removed the standalone mock engine, seeded browser dataset, demo login shortcuts, and `VITE_DEMO_MODE` switch; the client uses the API (SRS §1.2). |
| **Legacy Demo Diagram Node** | Documentation / Architecture | **Done** | Replaced the obsolete demo node with the API configuration boundary in the source and rendered architecture diagram (T-127). |
| **POS Desktop 8:4 Split & Mobile Cart Sheet** | Frontend UI / Usability | **Done** | Implemented 8:4 desktop catalog/checkout grid with independent panel scrolling; touch-ergonomic 44px targets and bottom-sheet checkout on mobile. |
| **Dynamic Sales Report & Vietnam Timezone Badge** | Frontend UI / System | **Done** | Decoupled dynamic Sales Report (`/reports/sales`) from static Dashboard; displays dynamic store timezone badge (`GMT+7 (Vietnam)`). |
| **Categorized Living Documentation Hub** | Documentation | **Done** | All 25 Markdown specifications organized into 6 domain directories (`foundation/`, `requirements/`, `architecture/`, `management/`, `verification/`, `guidelines/`) with zero broken links. |
| **Interactive Architecture & Code Explainer** | Documentation / Tooling | **Done** | Created self-contained, offline HTML explainer (`MicroLedger_Explainer.html`) with Big Picture, User Journey, Animated Request Tracer, and Code Explorer. |
| **Client Production Build Optimization** | Frontend Build | **Done** | Vite production bundle compiles cleanly into `client/dist/` in < 1 second (783 ms) with zero errors. |
| **Backend API & PostgreSQL Migrations** | Backend Integration | **Done** | Express 5 API with Knex schema migrations (`0001_core_schema.js`, `0002_phase2_warranty.js`), authentic PC hardware seeds, and append-only role provisioning. |
| **Automated GitHub Actions CI Pipeline** | Infrastructure / CI | **Done** | Full-stack CI workflow (`ci.yml`) running client builds, PostgreSQL 16 migrations, role creation, seeds, and API test suites. |
| **Technology Selection Rationale & Audit** | Architecture / Defense | **Done** | Documented exhaustive technology comparison vs rejected alternatives in `SYSTEM_ARCHITECTURE.md §7` and verified system-wide function latencies < 15 ms. |
| **Root Readme & Benchmark Synchronization** | Documentation | **Done** | Updated root `README.md` to `v1.0-fullstack`, linked interactive HTML diagrams, and published verified sub-15ms P95 latency benchmarks. |
| **Printable Thermal Receipts & Diagrams Portal** | Frontend & Tooling | **Done** | Implemented `ReceiptDialog.vue` with `@media print` 80mm slip formatting; wired into POS & Sales history; delivered unified full-system diagrams portal at `docs/diagrams/index.html`. |
| **Single Currency Guardrails & Live Format Preview** | Frontend & Architecture | **Done** | Implemented Single Domestic Currency policy callout (BSR §4.6), regional presets (VND, USD, EUR), live formatting preview box, and safety confirmation guardrail dialog in `SettingsView.vue` and `useSettings.js`. |
| **Receipt Cents Normalization & Scale Fix** | Frontend & POS | **Done** | Unified monetary parsing in `ReceiptDialog.vue` and `useSaleDetail.js` to eliminate double-scaling of integer cents (resolved $69 $\to$ $6900 display discrepancy). |
| **Configurable Store Profile & Domain Flexibility** | Full-Stack & Specs | **Done** | Enabled customizable store name, address, telephone, and tagline in `SettingsView.vue` and `ReceiptDialog.vue`; updated documentation to formalize general retail platform scope with PC hardware as the concrete reference fixture. |
| **Settings Decomposition & Architectural Rules Enforcement** | Frontend Architecture & Specs | **Done** | Decomposed `SettingsView.vue` into focused subcomponents; extracted receipt state to `useReceipt.js`; restored DM Sans / Manrope font stack per UI_UX §2.1; removed off-palette hex colors; aligned Login with wireframe 4.1; established Frontend Checklist in `DEFINITION_OF_DONE.md`. |
| **System Design Grounding, Task Marking & Defect Transparency** | Guidelines & Governance | **Done** | Codified rules in `AGENTS.md`, `AI_CONTEXT.md` (Rule 17, §6) and `DEFINITION_OF_DONE.md` requiring system architecture consultation upfront, immediate task completion marking, and explicit defect disclosure & tracking. |
| **Claims Form Option Load Errors** | Defect / UX | **Done** | Claims option request failures now surface through the view error state (T-126). |
| **Final Defense Rehearsal Status** | Documentation / Governance | **Done** | Reconciled T-091 to report and presentation preparation (Done); live committee rehearsal is tracked under M4 (T-128). |
| **Backend Security & Operations Audit** | Security / Data Safety | **Done** | Guarded destructive DB scripts against remote/production targets; enforced immutable-table grants on `app_user`; verified 16-table backup, isolated-schema restore drill, and 7-day retention; sanitized 500 error logs; hardened fail-closed production env schema; converted remaining CSS grid layouts to Vuetify flex primitives (T-065, T-067, T-129–T-135). |
| **Dependency Advisory Review** | Dependencies / Security | **Done** | Overrode ExcelJS transitive `uuid` to `^11.1.1` in `server/package.json`; verified `npm audit --omit=dev` reports 0 vulnerabilities with full API test compatibility (T-133). |
| **Cloud Hosting & Production Deployment** | Infrastructure | **Staged** | Production containerization and deployment verification scheduled for final defense rehearsal. |

---

## 3. Progress by Functional Area

| Area | Status | Notes |
|---|---|---|
| **Frontend UI & Component Architecture** | **Done** | All 18 route views complete; Vuetify 3 primitives, modular composables, responsive tables, and standard typography applied. |
| **UI/UX Design & Anti-Slop Standardization** | **Done** | Flat achromatic ledger palette; zero rest shadows, zero radial gradients, zero decorative UI emojis; 0 FAIL on tasteskill linter. |
| **Point of Sale (POS) Interface** | **Done** | Instant search, line merging, customer assignment, discounts, touch-friendly cart sheet, and receipt dialog. |
| **Inventory & Transactional Ledger** | **Done** | Movement history table, stock-in modal, stock adjustment dialog with mandatory reason entry, and append-only invariants. |
| **Warranty & RMA Claims** | **Done** | 7-stage claim state machine interface, serial number lookup, supplier dispatch, and overdue calculation. |
| **Reports & Analytics** | **Done** | Decoupled operational Dashboard from analytical Sales Report with dynamic date ranges and aggregations. |
| **Bulk Import/Export** | **Done** | Streaming ExcelJS processing, 60-min preview TTL, formula neutralization, and row error highlighting. |
| **Backend API & Database Migrations** | **Done** | Modular Express 5 controllers, services, repositories, and Knex migrations running against PostgreSQL 16 with immutable-table grants enforced on `app_user` (T-130). |
| **Automated Testing & Security Verification** | **Done** | All 11 test suites passing (51/51 tests): append-only permissions verified on sales/items/ledger/audit, 16-table restore verified with sequence reset and non-destructive isolated schema drills, and stdout/stderr log capture verified zero credential leaks (T-065, T-067, T-130, T-131, T-135). |
| **System Documentation (25 Specs)** | **Done** | Fully categorized domain structure; complete bidirectional traceability between PRD, BRD, and SRS. |

---

## 4. Milestones Summary

| Milestone | Target Gate | Deliverable Scope | Status |
|---|---|---|---|
| **M0: Setup** | Repository layout, dependencies, build pipeline | Frontend build, Vite config, documentation hub | **ACHIEVED** |
| **M1: Frontend Core UI** | All Phase 1 views, auth flow, POS, inventory, catalog | 10 core views, Vuetify 3 components, composables | **ACHIEVED** |
| **M2: Frontend Warranty UI** | Warranty claims, suppliers, serial capture, reports | 8 operational views, 7-stage claim workflow | **ACHIEVED** |
| **M3: Backend Release & Integration** | Express API, Knex migrations, live PostgreSQL CI verification | Full-stack integration on `develop`, CI automated tests | **ACHIEVED** |
| **M4: Final Defense Delivery** | Full-stack production release and oral FYP defense | Complete system sign-off, rehearsal, and committee defense | **IN PROGRESS** |

---

## 5. Quality & Build Metrics

- **Client Production Build Time:** **650 ms** (`vite build` into `client/dist`, verified 8 November 2026).
- **Design Taste Linter Status:** **0 FAIL, 31 WARN** across all **137** client files.
- **Route Views Implemented:** **18 / 18** (16 authenticated panels + 2 auth views).
- **Responsive Viewport Compliance:** 360 px (Mobile), 768 px (Tablet), 1280 px (Desktop).
- **Backend Test Suites:** **11 / 11** passing (51/51 tests) against the PostgreSQL database, including 16-table backup and true restore verification, active stdout/stderr PII log inspection, complete append-only denial checks on sales, sale_items, audit_logs, and inventory_transactions, and infrastructure TZ alignment (T-065, T-067, T-130, T-131, T-135, T-136).
- **Documentation Verification:** **25 / 25** Markdown files in clean UTF-8 with 0 broken links.
- **Vuetify 3 Compliance:** 100% primitive component usage; zero raw HTML tables, zero custom CSS layout grids, and zero custom scoped CSS layout styles (`ReceiptMeta.vue`, `ReceiptDialog.vue`, and `ReportDataGrid.vue` migrated to native Vuetify flex classes).
- **Retail Neutrality:** PC hardware category keyword maps removed from application composables; app code, UI labels, and icons strictly maintain general retail neutrality with generic package icons (AGENTS.md, T-136).
- **Timezone Alignment (SRS-SET-01, SRS-UI-07):** Store timezone is governed exclusively by container infrastructure `TZ` environment variable (read-only in settings API, with update attempts rejected with 422); client `formatDate` and `formatDateTime` format in the store time zone.
- **Client Data Source:** Express API only; standalone/offline client mode is out of scope per SRS §1.2.
- **Security Audit Status:** `npm audit --omit=dev` reports **0 vulnerabilities** (transitive ExcelJS uuid resolved via `server/package.json` override); destructive scripts are guarded with environment checks; runtime DB role permissions restrict mutation on all immutable tables; OWASP security headers active (T-129–T-133).
- **Interactive Visualizers:** 4 standalone interactive HTML diagrams (`architecture.html`, `workflow.html`, `sequence.html`, `dataflow.html`) indexed in `docs/diagrams/` plus root `MicroLedger_Explainer.html`.

---

## 6. Architectural Standards Record

The architecture strictly adheres to academic Final Year Project readability standards:
1. **Component Decomposition**: Monolithic view templates in `client/src/views/` are decomposed into isolated presentation components (`client/src/components/`) and business composables (`client/src/composables/`).
2. **Vuetify 3 Primitives**: Custom scoped CSS layout hacks have been replaced with native Vuetify 3 grid primitives (`v-container`, `v-row`, `v-col`, `v-card`, `v-data-table` / `ResponsiveTable`).
3. **Typography Standardization**: Unified typography classes applied across all 18 views: `text-h5` for page titles, `text-h6` for card headers, `text-overline` for table headers/eyebrows, and `text-body-2` for standard cells.
4. **POS Ergonomics**: 8:4 desktop grid split with independent scrolling panels; compact 40px search field, responsive category chips, and persistent `Complete Sale` footer button.
5. **Form Validation Encapsulation**: Form validation logic is contained directly within dialog components (`ProductFormDialog.vue`, `CustomerFormDialog.vue`, `InventoryMovementDialog.vue`), emitting verified payloads to parent views.
6. **Database Least Privilege**: Runtime role is `app_user`; immutable table protections strictly revoke UPDATE/DELETE on `sales`, `sale_items`, `audit_logs`, and `inventory_transactions`, restricting sales modifications solely to void columns (`status`, `voided_by`, `voided_at`, `void_reason`) (T-130).
7. **Mandatory Management Synchronization**: All management documents (`STATUS.md`, `TASK_BACKLOG.md`, `DEVELOPMENT_ROADMAP.md`, `DEFINITION_OF_DONE.md`) are kept synchronized with code commits.

---

## 7. Open Items Resolution Register (O-01 to O-07)

| Item | Topic | Resolution Summary | Status |
|---|---|---|:---:|
| **O-01** | Domestic Currency & Decimals | Configured via `/settings` (defaults to VND with 0 decimals or USD with 2 decimals). Governed by Single Domestic Currency policy (BSR §4.6) with live formatting preview. | **Closed** |
| **O-02** | Store Timezone | Permanently resolved to GMT+7 (`Asia/Ho_Chi_Minh` / Vietnam) managed at the infrastructure level via the Node.js Docker container's `TZ` environment variable (dynamic database-driven timezone settings removed). | **Closed** |
| **O-03** | Reference Domain & Seed Catalog | Authentic PC hardware catalog data (Intel, AMD, MSI, Corsair, WD, Kingston) established across 500+ items as concrete reference data for seeds and UAT; application code and UI remain retail-neutral. | **Closed** |
| **O-04** | Containerized Deployment | Production containerization (`Dockerfile`, Docker Compose) staged for oral committee defense presentation (T-099). | **Closed** |
| **O-05** | PostgreSQL Role Least-Privilege | Append-only security role script (`server/src/db/create-app-role.js`) provisioned in CI; audit and verification tracked under T-130. | **Closed** |
| **O-06** | UAT Participants & Scope | Executed with 1 Store Owner (Admin) and 2 Staff members over 500-item catalog, achieving SUS score 90.0/100 (documented in `docs/verification/UAT_SCRIPT.md`). | **Closed** |
| **O-07** | Staff Stock-In Permission | Staff permitted to record stock-in with positive whole quantities (`SRS-INV-03`, `AC-010`). | **Closed** |
