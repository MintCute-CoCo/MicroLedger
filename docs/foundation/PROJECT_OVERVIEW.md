# MicroLedger — Project Overview

> Responsive Web POS, Inventory & Warranty Tracking for small retail stores
> Baseline: BRD v3.1 · PRD v3.1 · SRS v1.0 · Last updated: 4 October 2026

## 1. What is MicroLedger?

MicroLedger is a lightweight web application for small retail businesses that run on Excel and manual processes today. It is **one responsive app** (PC, tablet, mobile browser) that combines:

- product and category management
- inventory with a full stock-movement ledger
- simple POS sales that deduct stock automatically and safely
- basic customer records
- Excel/CSV import (with preview) and export
- dashboard, reports and an audit log
- a warranty and claim tracking workflow (Phase 2)

Initial product areas: household products, indoor/outdoor electrical products, and furniture.

It is deliberately **not** an ERP, an accounting system or a repair-shop system.

## 2. Who is it for?

| Role | Typical person | Main use |
|---|---|---|
| Admin | Store owner / manager | Configure, import, adjust stock, void sales, reports, users |
| Staff | Counter employee | Sell, receive stock, look up customers, handle claims |

## 3. Feature summary by phase

| Phase | Content |
|---|---|
| **Phase 1 — Core (Must)** | Login and users, roles, products, categories, inventory and movement history, stock-in and adjustment, POS sales (payment method, optional discount), sale void, customers, Excel/CSV import with preview, export, dashboard and reports, search, audit log, store settings |
| **Phase 2 — Warranty (Should)** | Low-stock alert, suppliers, per-product warranty, claims with 7 statuses, supplier/return tracking with overdue calculation, serial numbers, advanced filtering |
| **Phase 3 — UAT** | User acceptance testing, defect fixing, hardening, final documentation |
| **Could Have** | Barcode scanning, purchase orders, product images, partial returns/refunds, price override with approval, expiry notifications, profit analytics |

## 4. Technology (selected)

| Layer | Technology |
|---|---|
| Frontend | Vue 3 (Composition API) + Vite, Vue Router, Pinia, Vuetify 3 |
| API | Node.js + Express, REST/JSON, Zod validation |
| Database | **PostgreSQL 16** (managed), node-postgres + Knex migrations |
| Auth | App-managed username/password, argon2id (or bcrypt), JWT access + refresh cookie |
| Excel/CSV | ExcelJS (server side only) |
| Hosting | Static frontend host, Render API, managed PostgreSQL |
| Tooling | Git/GitHub, GitHub Actions, Vitest/Jest + Supertest, Playwright |

## 5. Key design principles

1. Browser talks only to the API, never to the database.
2. All business rules live in the API service layer; database constraints are the backstop.
3. Every stock change happens inside one database transaction and writes one ledger row.
4. Negative stock is impossible (`CHECK (stock_qty >= 0)`).
5. Money is `NUMERIC(12,2)`; timestamps are UTC `TIMESTAMPTZ`. Store timezone (GMT+7) is anchored via container `TZ=Asia/Ho_Chi_Minh`.
6. Sales, ledger and audit records are append-only; database role `app_user` has `UPDATE` and `DELETE` revoked on ledger and audit tables.
7. Frontend strictly uses Vuetify 3 component primitives (`v-container`, `v-row`, `v-col`, `v-card`, `v-data-table` / `ResponsiveTable`, `v-btn`, etc.); raw HTML tables and scoped CSS layout hacks are prohibited.
8. Operational Dashboard (Today + 7-Day snapshot) is decoupled from analytical Sales Report (`/reports/sales`, dynamic date ranges, aggregations, net revenue).
9. Authentic PC hardware catalog seeds (Intel, MSI, Corsair, WD, Kingston); zero Faker.js or random string hashes.

## 6. Document map

The documentation suite is structured into dedicated domain folders:

| Domain | File | Purpose |
|---|---|---|
| **Foundation** | [PROJECT_CHARTER.md](PROJECT_CHARTER.md) | Why the project exists, who is involved, success |
| **Foundation** | [PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md) | The problem being solved |
| **Foundation** | [OBJECTIVES.md](OBJECTIVES.md) | Measurable objectives |
| **Foundation** | [SCOPE.md](SCOPE.md) | In scope / out of scope |
| **Foundation** | [BSR.md](BSR.md) | Business requirements (from BRD v3.1) |
| **Requirements** | [SRS.md](../requirements/SRS.md) | Software requirements (from SRS v1.0) |
| **Requirements** | [USER_STORIES.md](../requirements/USER_STORIES.md) | Stories per feature |
| **Requirements** | [ACCEPTANCE_CRITERIA.md](../requirements/ACCEPTANCE_CRITERIA.md) | Given/When/Then checks |
| **Requirements** | [USER_ROLES.md](../requirements/USER_ROLES.md) | Roles and permission matrix |
| **Architecture** | [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md) | Components, flows, folders |
| **Architecture** | [DATABASE_DESIGN.md](../architecture/DATABASE_DESIGN.md) | Schema, SQL, invariants |
| **Architecture** | [UI_UX_WIREFRAMES.md](../architecture/UI_UX_WIREFRAMES.md) | Navigation and wireframes |
| **Management** | [DEVELOPMENT_ROADMAP.md](../management/DEVELOPMENT_ROADMAP.md) | Phases, sprints, milestones |
| **Management** | [TASK_BACKLOG.md](../management/TASK_BACKLOG.md) | Epics and tasks |
| **Management** | [STATUS.md](../management/STATUS.md) | Current progress and next steps |
| **Management** | [DEFINITION_OF_DONE.md](../management/DEFINITION_OF_DONE.md) | When work counts as done |
| **Guidelines** | [AI_CONTEXT.md](../guidelines/AI_CONTEXT.md) | Rules for AI coding assistants |
| **Hub** | [README.md](../README.md) | Documentation index and reading paths |

## 7. Open items (Resolved)

Open items O-01 (VND/0 decimals), O-02 (container `TZ=Asia/Ho_Chi_Minh`), O-03 (authentic PC hardware catalog), O-04 (containerized hosting), O-05 (PostgreSQL 16 role permissions), O-06 (UAT 1 Admin + 2 Staff), and O-07 (Staff stock-in confirmed) are all fully resolved and closed in [`../management/STATUS.md`](../management/STATUS.md).
