# Definition of Done (DoD)

> Quality gates, architectural standards, and verification criteria for MicroLedger deliverables.  
> This document governs release readiness for the **Frontend Application Release** and sets the acceptance standards for the subsequent backend integration phase.

---

## 1. Frontend Application Release Gate (Current Deliverable)

The **Frontend Single-Page Application (`client/`)** is considered **Done** and ready for GitHub presentation when every criterion below is verified:

## Frontend Checklist (reusable criteria for each UI task)

The unchecked boxes below are a per-task evidence template. They are not project backlog tasks; check them in the task record when that task is completed. Release-level completion is recorded in Sections 1.1–3 and the management tracker.
- [ ] Docs & System Design read: AGENTS.md, AI_CONTEXT.md, UI_UX_WIREFRAMES.md, SYSTEM_ARCHITECTURE.md, and the SRS/AC IDs for this task (list the IDs). Grounded in the system architecture to prevent disconnected code.
- [ ] grep output attached, zero violations (or each hit justified with a doc section) for:
      - font-size with px
      - <table, <tr, <td
      - <style scoped containing layout rules
      - box-shadow on resting elements
      - emoji or decorative symbols in text
      - gradients
      - hex colors outside the documented palette tokens
      - .vue files missing <script setup>
- [ ] Strict Domain Decoupling: Views are thin assembly containers; every distinct function (card, table, form dialog, slip) is separated into its own component in a domain folder (client/src/components/<domain>/); calculation, formatting and state live in composables.
- [ ] Money is never calculated with JS floats; the client never computes or sends prices; Staff never see cost data (AI_CONTEXT rules 6, 8, 10).
- [ ] Every function has a block comment; no one-liners or chained array methods; one statement per line (AI_CONTEXT §10-11).
- [ ] Typography uses only text-h5, text-h6, text-overline, text-body-2, text-caption; fonts per UI_UX §2.1 (DM Sans, Manrope).
- [ ] Touch targets are at least 44px; layout works at 360px width.
- [ ] Defect transparency & tracking: Any bugs, defects, visual glitches, or substandard patterns discovered during the work are explicitly stated in the response and recorded in TASK_BACKLOG.md / STATUS.md.
- [ ] Task completion marked: STATUS.md, TASK_BACKLOG.md, DEVELOPMENT_ROADMAP.md and DEFINITION_OF_DONE.md are updated, with completed items explicitly marked Done (AGENTS.md rules 13, 14, 15).
- [ ] No suppression comments without a cited doc section.

### 1.1 UI/UX & Component Architecture
- [x] **Strict Vuetify 3 Primitives**: All 18 route views (16 authenticated panels + 2 auth flows) use native Vuetify 3 components (`v-container`, `v-row`, `v-col`, `v-card`, `v-data-table` / `ResponsiveTable`, `v-btn`, `v-select`, `v-chip`, `v-dialog`). Zero raw HTML tables (`<table>`) and zero scoped CSS layout hacks.
- [x] **Universal Layout Wrapper**: All 16 authenticated views are wrapped in an identical `<v-container fluid class="pa-4 pa-md-6">` container, ensuring zero vertical jumps or header shifts during route navigation.
- [x] **Typographic Standardization**: Universal typography scale applied across all panels in strict compliance with `AI_CONTEXT.md`:
  - `text-h5 font-weight-bold` for Page Titles
  - `text-h6 font-weight-bold` for Card Headers & Modals
  - `text-overline font-weight-bold` for Table Headers & Eyebrows
  - `text-body-2` for Standard Data & Body Text
  - `text-caption` for Helper Text & Input Validation
- [x] **Component Decomposition**: Complex views are modularized into self-contained presentation subcomponents (`client/src/components/<feature>/`) and dedicated business logic composables (`client/src/composables/<feature>/`).
- [x] **Form Validation Encapsulation**: Form validation logic is contained directly within dialog components (`ProductFormDialog.vue`, `CustomerFormDialog.vue`, `InventoryMovementDialog.vue`), emitting validated payloads.
- [x] **Responsive Viewports**: Verified responsive behavior across mobile (< 600 px), tablet (600–1024 px), and desktop (> 1024 px):
  - POS terminal implements an 8:4 desktop catalog/checkout grid with independent panel scrolling.
  - Mobile checkout uses an ergonomic touch-friendly bottom sheet with 44 px touch targets.
  - Tables switch smoothly to card representations on mobile viewports via `ResponsiveTable.vue`.
- [x] **Resilient State & Error Handling**: Loading, empty, and error alert banners are handled across all panels; submission buttons disable during in-flight requests. Stale POS catalog searches are aborted to prevent out-of-order race conditions.

### 1.2 Frontend Build & Code Integrity
- [x] **Zero Build Errors**: Production build (`npm run build` in `client/`) passes cleanly with zero warnings or errors in < 1 second.
- [x] **Anti-Slop & Design Taste (`tasteskill v2`)**: 0 FAIL in tasteskill linter; flat achromatic ledger aesthetic; zero fuzzy drop shadows on resting elements; zero decorative UI emojis; zero radial gradients.
- [x] **ResponsiveTable Vuetify 3 Primitives**: Universal data grid wrapper built exclusively with Vuetify 3 components (`v-card`, `v-row`, `v-col`), with zero custom CSS grids and zero `px` font sizes.
- [x] **API-Only Client Data Access**: Removed standalone mock data, request interception, demo login shortcuts, and the `VITE_DEMO_MODE` switch. Browser application data is provided by the Express API, consistent with SRS §1.2.
- [x] **Clean Dependency Footprint**: Only authorized dependencies utilized (Vue 3, Vite 8, Vuetify 3, Pinia 4, Vue Router 4, @mdi/font).
- [x] **Clean Code Standards**: No squashed minified code, no dead code, and full compliance with academic Final Year Project readability standards.

---

## 2. Living Documentation Gate

The project documentation suite is considered **Done** and ready for repository presentation when:
- [x] **Categorized Organization**: All 25 specification documents organized into 6 dedicated domain subdirectories (`foundation/`, `requirements/`, `architecture/`, `management/`, `verification/`, `guidelines/`) with a master index at `docs/README.md`.
- [x] **Traceability & Consistency**: Specifications align 100% with the as-built reality (18 route views, 15 backend domain modules, 16 relational database tables, append-only security on sales/items/ledger/audit, container `TZ=Asia/Ho_Chi_Minh` timezone, and calibrated audit claims; T-134).
- [x] **Zero Broken Links**: All internal Markdown hyperlinks validated and verified with 0 broken links.
- [x] **Clean Encoding**: All documents verified in 100% clean UTF-8 with zero mojibake or corrupted characters.
- [x] **Mandatory Management Synchronization**: All records in `docs/management/` (`STATUS.md`, `TASK_BACKLOG.md`, `DEVELOPMENT_ROADMAP.md`, `DEFINITION_OF_DONE.md`) updated synchronously with each commit.

---

## 3. Full-Stack Backend Integration Gate (Verified)

Criteria governing backend release readiness and automated CI verification:

### 3.1 Backend Business Logic & Database Invariants
- [x] **Service Layer Authority**: All business logic and transactional boundaries live exclusively in domain services (`server/src/modules/<feature>/service.js`).
- [x] **Role Authorization**: Admin vs Staff RBAC enforced on every API route; Staff responses strictly redact `cost_price` and profit margin data.
- [x] **Stock Ledger Invariant**: Every inventory change writes an immutable transaction in `inventory_transactions` within the same database transaction.
- [x] **Conditional Atomic Deductions**: POS sales decrement inventory using conditional atomic SQL queries (`WHERE stock_qty >= $qty`); negative stock mathematically impossible (`CHECK stock_qty >= 0`).
- [x] **Append-Only Database Security**: Runtime role `app_user` is demonstrably unable to update/delete `audit_logs`, `inventory_transactions`, `sales`, and `sale_items`, with only column-level status/reason updates allowed on `sales` for the documented void workflow (T-130).
- [x] **Destructive Script Safety**: Reset and clean scripts (`reset.js`, `clean.js`) refuse production targets without explicit `ALLOW_DESTRUCTIVE_DB=true`, require production password configuration, and omit plaintext credentials from console logs (T-129).
- [x] **Backup and Recovery**: Scheduled backups cover all 16 system tables, enforce seven-day retention, and are verified through a true restoration drill (`restoreFromBackup`) resetting identity sequences (T-065, T-131).
- [x] **Production Hardening**: Production env schema fails closed if `APP_DATABASE_URL` or `JWT_SECRET` (min 32 chars) is missing; OWASP security headers (`nosniff`, `DENY`, `HSTS`, `CSP`) active on all responses (T-132).
- [x] **Dependency Review**: Moderate uuid dependency advisory resolved via `overrides` in `server/package.json`; `npm audit --omit=dev` verifies 0 vulnerabilities (T-133).
- [x] **Application Log Privacy**: Intercept application stdout/stderr streams during authentication and error handling to verify customer credentials, password hashes, and tokens are completely absent from logs (T-067).
- [x] **Server-Side File Processing**: Spreadsheet imports (`.xlsx`, `.csv`) processed in-memory via streaming ExcelJS with 60-minute preview TTL; export formulas neutralized.

### 3.2 Testing, CI & Verification
- [x] **Automated Acceptance Suite**: All 43 functional acceptance criteria (AC-001 through AC-043) verified against a live PostgreSQL test instance across 11 test suites (`server/tests/`).
- [x] **Automated GitHub Actions CI**: Continuous integration workflow (`.github/workflows/ci.yml`) executes client build, Knex migrations, application role provisioning, seed population, and server test suites on Ubuntu with PostgreSQL 16.
- [x] **Performance Benchmarks**: P95 product search latency $\le 1,000$ ms and P95 sales latency $\le 2,000$ ms verified via `scripts/load-test.js`.
- [x] **Authentic PC Hardware Seeds**: Database populated with authentic Vietnamese PC hardware store inventory (Intel, AMD, MSI, Corsair, WD, Kingston) across 500+ records.
- [x] **Live UAT Verification**: UAT completed with 1 Store Owner and 2 Staff members over the authentic catalog (`npm run seed:uat`), achieving SUS score $\ge 68.0$ (achieved 90.0/100).
- [ ] **Production Cloud Deployment**: Final production cloud hosting verification scheduled for oral committee presentation.
- [ ] **Final Defense Rehearsal**: Committee walkthrough and final release sign-off completed (governed by milestone M4; T-128 reconciled).
