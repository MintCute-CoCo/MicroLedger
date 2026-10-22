# Definition of Done (DoD)

> Quality gates, architectural standards, and verification criteria for MicroLedger deliverables.  
> This document governs release readiness for the **Frontend Application Release** and sets the acceptance standards for the subsequent backend integration phase.

---

## 1. Frontend Application Release Gate (Current Deliverable)

The **Frontend Single-Page Application (`client/`)** is considered **Done** and ready for GitHub presentation when every criterion below is verified:

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
- [x] **Clean Dependency Footprint**: Only authorized dependencies utilized (Vue 3, Vite 8, Vuetify 3, Pinia 4, Vue Router 4, @mdi/font).
- [x] **Clean Code Standards**: No squashed minified code, no dead code, and full compliance with academic Final Year Project readability standards.

---

## 2. Living Documentation Gate

The project documentation suite is considered **Done** and ready for repository presentation when:
- [x] **Categorized Organization**: All 25 specification documents organized into 6 dedicated domain subdirectories (`foundation/`, `requirements/`, `architecture/`, `management/`, `verification/`, `guidelines/`) with a master index at `docs/README.md`.
- [x] **Traceability & Consistency**: Specifications align 100% with the as-built reality (18 route views, 15 backend domain modules, 16 relational database tables, append-only security, container `TZ=Asia/Ho_Chi_Minh` timezone).
- [x] **Zero Broken Links**: All internal Markdown hyperlinks validated and verified with 0 broken links.
- [x] **Clean Encoding**: All documents verified in 100% clean UTF-8 with zero mojibake or corrupted characters.

---

## 3. Subsequent Backend Integration Gate (Staged Phase)

Criteria governing the subsequent backend repository release:

### 3.1 Backend Business Logic & Database Invariants
- [ ] **Service Layer Authority**: All business logic and transactional boundaries live exclusively in domain services (`server/src/modules/<feature>/service.js`).
- [ ] **Role Authorization**: Admin vs Staff RBAC enforced on every API route; Staff responses strictly redact `cost_price` and profit margin data.
- [ ] **Stock Ledger Invariant**: Every inventory change writes an immutable transaction in `inventory_transactions` within the same database transaction.
- [ ] **Conditional Atomic Deductions**: POS sales decrement inventory using conditional atomic SQL queries (`WHERE stock_qty >= $qty`); negative stock mathematically impossible (`CHECK stock_qty >= 0`).
- [ ] **Append-Only Database Security**: Runtime connects via restricted `app_user` with `UPDATE` and `DELETE` revoked on `audit_logs` and `inventory_transactions`.
- [ ] **Server-Side File Processing**: Spreadsheet imports (`.xlsx`, `.csv`) processed in-memory via streaming ExcelJS with 60-minute preview TTL; export formulas neutralized.

### 3.2 Testing, UAT & Deployment
- [ ] **Automated Acceptance Suite**: All 43 functional acceptance criteria (AC-001 through AC-043) verified against a live PostgreSQL test instance.
- [ ] **Performance Benchmarks**: P95 product search latency $\le 1,000$ ms and P95 sales latency $\le 2,000$ ms verified via `scripts/load-test.js`.
- [ ] **Live UAT Session**: UAT executed with 1 Store Owner and 2 Staff members over the authentic 500-product hardware catalog (`npm run seed:uat`), achieving SUS score $\ge 68.0$.
- [ ] **Production Deployment**: Cloud hosting verified with HTTPS, CORS origin restrictions, secure cookies, and scheduled backup/restore routines.
