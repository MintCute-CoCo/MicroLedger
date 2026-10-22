# AI Context — read this first

> For AI coding assistants (Claude Code, Copilot, Cursor, etc.) and for new contributors. Keep this file short and current. If anything here conflicts with `SRS.md`, the SRS wins; then fix this file.

## 1. What this project is

MicroLedger: a responsive web POS, inventory and warranty-tracking app for **one small retail store**. Final year project. Users: **Admin** and **Staff**. Phase 1 (Must) = core POS/inventory/import. Phase 2 (Should) = warranty, suppliers, serials, filtering. Not an ERP, not accounting, not a repair-shop system.

## 2. Stack (decided)

- Client: Vue 3 (Composition API, `<script setup>`), Vite, Vue Router, Pinia, Vuetify 3
- Server: Node.js LTS, Express, Zod, node-postgres + Knex (migrations, query building)
- Database: PostgreSQL 16 (managed)
- Auth: own login; argon2id (or bcrypt cost ≥ 12); JWT access token (15 min) + rotating refresh token in httpOnly cookie (8 h)
- Excel/CSV: ExcelJS, **server only**
- Tests: Vitest/Jest, Supertest (real PostgreSQL test DB), Playwright
- Do **not** introduce Firebase, MongoDB, Prisma, or client-side Excel parsing (PapaParse) unless the decision log is changed first.

## 3. Hard rules (never break)

1. The browser calls only the API; never the database.
2. All business rules live in **services**. Controllers do HTTP only. Repositories do SQL only.
3. Any change to stock happens in **one DB transaction** that also writes one `inventory_transactions` row and (where required) an audit row.
4. Reduce stock with a **conditional update**: `UPDATE products SET stock_qty = stock_qty - $q WHERE id = $id AND status='active' AND stock_qty >= $q RETURNING ...`. Zero rows → reject the sale.
5. **Negative stock is impossible** (service check + `CHECK (stock_qty >= 0)`).
6. The client **never sends prices**. The server uses the current `selling_price` and stores a snapshot on `sale_items`.
7. Sales, sale items, `inventory_transactions` and `audit_logs` are **never edited or deleted** by the app. The only change to a sale is a void.
8. Money = `NUMERIC(12,2)` in DB; strings with 2 decimals in JSON; never JS floats for calculations (use integer minor units or a decimal library).
9. Timestamps `TIMESTAMPTZ` (UTC). The store timezone (GMT+7 / `Asia/Ho_Chi_Minh`) is handled strictly at the infrastructure level via the Node.js Docker container's `TZ` environment variable. There is no dynamic database-driven timezone setting.
10. Every endpoint declares allowed roles; the server checks them. The system uses a strict two-role architecture (**Admin** and **Staff**). **Staff responses never contain `cost_price`, stock value or profit data.**
11. Excel/CSV: parse and validate **only on the server**, streaming, never write uploads to disk. Exports neutralise text starting with `=`, `+`, `-`, `@`, tab, CR.
13. No secrets in Git. Config from environment variables.
14. All database seeds and test fixtures strictly use authentic PC hardware catalog data (Intel, MSI, Corsair, WD, Kingston). Faker.js and random hash strings are prohibited.
15. Frontend strictly uses Vuetify 3 components (`v-container`, `v-row`, `v-col`, `v-card`, `v-data-table` / `ResponsiveTable`, `v-btn`, `v-select`, `v-chip`, etc.) for all layouts, grids, and UI elements. Raw HTML tables (`<table>`, `<tr>`, `<td>`) and custom scoped CSS for layout purposes are strictly prohibited.
16. **Reporting Scope & Profit/Margin:** The Dashboard is strictly a static "Today / 7-Day" operational performance snapshot. Dynamic date-range boundaries and multidimensional groupings (`day`, `product`, `category`, `user`, `payment`) are exclusively handled by the dedicated Sales Report module (`/reports/sales`, `SalesReportView.vue`). Profit and margin calculations and cost-price tracking in sales reports are out of scope (Could Have); sales reports evaluate units sold, subtotal, discounts, and net revenue.

## 4. Business rules in one place

- SKU unique among **active** products (trimmed, case-insensitive). Reactivation blocked on conflict.
- Products and customers are deactivated/kept, never deleted.
- Sale: ≤ 100 lines, merge repeated products, discount between 0 and subtotal, payment ∈ cash/card/bank_transfer/other, `Idempotency-Key` required, number `S-000001` from a sequence.
- Void: Admin only, reason required, restores stock via `void_reversal` rows, once only; blocked if the sale has an active claim (Phase 2).
- Import: preview first (stored in `import_logs`, expires after 60 min); commit is one transaction; existing SKU updates fields but **never stock**; opening stock for new products only; limits 5,000 rows / 5 MB.
- Export: Admin only; max 50,000 rows; CSV UTF-8 with BOM.
- Warranty (Phase 2): expiry = sale date + product `warranty_months` (month-end clamped); claim needs a customer with phone; 7 statuses; transitions enforced in one endpoint; **overdue is calculated, never stored** (status With Supplier, no actual return date, expected date before today).
- Claim transitions: Submitted → With Supplier | Ready for Customer | Rejected* | Cancelled*; With Supplier → Returned | Cancelled*; Returned → Ready for Customer; Ready for Customer → Completed. (*Admin only.) Completed/Rejected/Cancelled are final and read-only.
- Lockout: 5 failed logins → locked 15 min.

## 5. Conventions

| Area | Convention |
|---|---|
| DB names | `snake_case`, plural tables, `BIGINT` identity keys |
| JS | `camelCase` variables, `PascalCase` Vue components, ES modules |
| API | `/api/v1`, REST/JSON, errors `{ code, message, details }` with codes from SRS §8 |
| Lists | `page` (default 1), `pageSize` (default 25, max 100), filters, sort |
| Module layout | `routes.js`, `controller.js`, `service.js`, `repository.js`, `schema.js` (Zod), tests beside code |
| Migrations | One Knex migration per change; never edit an applied migration |
| Commits | Small, imperative; reference the task ID (for example `T-040`) |
| Tests | Every business rule BR-01…BR-19 has a test; integration tests use a real PostgreSQL |

## 6. How to work on a task

1. Find the task in `TASK_BACKLOG.md` and its requirement IDs in `SRS.md`.
2. Read the matching acceptance criteria in `ACCEPTANCE_CRITERIA.md`.
3. Write or update tests first for the business rule.
4. Implement service → repository → controller → route → client.
5. Check against `DEFINITION_OF_DONE.md`.
6. Update `STATUS.md` (task status, decisions, open items).

## 7. When unsure

- Do not guess a business rule. Check `SRS.md`, then `BSR.md`. If still unclear, list the question under "Open questions" in `STATUS.md` and ask.
- Open items status: O-01 (VND/0 decimals), O-02 (container TZ=Asia/Ho_Chi_Minh), O-03 (authentic PC hardware catalog), O-04 (containerized hosting), O-05 (PostgreSQL 16 role permissions), O-06 (UAT 1 Admin + 2 Staff), and O-07 (Staff stock-in confirmed) are all fully resolved and closed in `STATUS.md`.

## 8. Common mistakes to avoid

- Updating `stock_qty` without writing the ledger row.
- Reading stock, checking in JS, then writing (race condition). Use the conditional update.
- Trusting a price, role or user id from the request body.
- Hiding a button and calling it "security".
- Parsing Excel in the browser or saving uploads on the server disk.
- Computing "today" in server local time instead of the store time zone.
- Returning cost data to Staff.
- Storing overdue as a status or column.
- Deleting rows instead of deactivating or voiding.

## 9. Document map

All project documentation is structured in `docs/`:
- **Foundation (`docs/foundation/`)**: `PROJECT_OVERVIEW.md`, `PROJECT_CHARTER.md`, `PROBLEM_STATEMENT.md`, `OBJECTIVES.md`, `SCOPE.md`, `BSR.md`
- **Requirements (`docs/requirements/`)**: `SRS.md` (authoritative), `USER_STORIES.md`, `ACCEPTANCE_CRITERIA.md`, `USER_ROLES.md`, `PRD_ALIGNMENT.md`
- **Architecture (`docs/architecture/`)**: `SYSTEM_ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `UI_UX_WIREFRAMES.md`
- **Management (`docs/management/`)**: `DEVELOPMENT_ROADMAP.md`, `TASK_BACKLOG.md`, `STATUS.md`, `DEFINITION_OF_DONE.md`
- **Verification (`docs/verification/`)**: `UAT_SETUP.md`, `UAT_SCRIPT.md`, `FINAL_REPORT.md`, `DEMO_SCRIPT.md`
- **Guidelines (`docs/guidelines/`)**: `AI_CONTEXT.md`, `AGENTS.md`, and master index `docs/README.md`.

## 10. FYP Coding Style (Student Requirements)

Because this is an academic Final Year Project, the codebase must be easily readable and explainable. You must strictly adhere to the following coding style:
- **No One-Liners:** Avoid clever, dense one-liners, nested ternaries, or heavy method chaining. 
- **Explicit Separation:** Break complex logic down into discrete, step-by-step intermediate variables. Prioritize readability over brevity.
- **Mandatory Comments:** Every single function must have a block comment above it explaining its purpose, inputs, and expected output. Add inline comments for any complex logic.
- **Avoid Enterprise Over-Engineering:** Do not introduce complex design patterns (like factories, abstract classes, or aggressive DRY abstractions) unless absolutely necessary. Keep the service, repository, and controller layers straightforward and explicit.

## 11. Frontend Vue Coding Style (Student Requirements)

The frontend codebase must follow strict readability rules for academic evaluation:
- **Component-Based Architecture:** Do not build massive, monolithic `.vue` files in the `views/` directory. Any view containing multiple logical sections (e.g., summary cards, filter bars, data tables, modals) MUST be broken down into smaller, self-contained components in a `components/` subdirectory. The main view file should act only as a clean container importing these pieces.
- **Vuetify 3 Exclusivity & No Raw HTML Tables:** The UI strictly uses Vuetify 3 component primitives (`v-container`, `v-row`, `v-col`, `v-card`, `v-data-table` / `ResponsiveTable`, `v-btn`, `v-select`, etc.) for all layouts, grids, and UI elements. Raw HTML tables (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`) and custom ad-hoc scoped CSS layout hacks (such as custom CSS grids or absolute positioning for structural layouts) are strictly banned.
- **No Minified-Style Code:** Absolutely no squashing multiple statements onto a single line. Every variable declaration, `if` statement, HTML tag, and function call must be on its own line with proper vertical indentation.
- **Deconstruct Array Methods:** Do not chain complex `.filter().map().reduce()` operations on a single line. Break them down into intermediate variables with explicit `return` statements so the logic is easy to explain during a defense.
- **Template Formatting:** Vue `<template>` tags must be formatted with standard HTML indentation. Limit the number of attributes per line to ensure the DOM structure is highly readable.
- **Pixel-Perfect Consistency & Responsive UI:** All views must maintain exact vertical alignment and typography across the entire application. Use identical Vuetify spacing classes (e.g., `<v-container fluid class="pa-4 pa-md-6">`) for all main view wrappers so page headers never jump up or down when navigating. Enforce strict Vuetify typography (`text-h5` for titles, `text-body-2` for standard text). Strictly avoid custom CSS `px` sizes. Always protect mobile layouts by using `d-flex flex-wrap` and mobile-specific column sizing (`cols="12" sm="6"`) for action buttons and filters.
- **Strict Typography & Font Size Guide:** Absolutely no custom `font-size: XXpx;` rules are allowed in CSS. You must strictly use the following Vuetify 3 typography classes to ensure perfect visual parity across all panels:
  - **Page Titles:** `text-h5` (e.g., "Products", "Sales Report").
  - **Card Headers & Modal Titles:** `text-h6`.
  - **Table Headers & Eyebrows:** `text-overline`.
  - **Standard Data & Body Text:** `text-body-2` (compact and readable).
  - **Helper Text & Validation:** `text-caption`.

## 12. Test Data & Database Seeding

To preserve the realism, professional presentation, and academic integrity of this project:
- **No Random Generators:** Absolutely no Faker.js, random string hashes (e.g., `Product_1792...`, `SKU_179...`), or generic placeholder text (`Test Customer`, `Supplier A`, `Reject Customer`) may be used in this project.
- **Domain-Specific Realism:** All seed data, UAT data, and test cases MUST use highly realistic, domain-specific data matching a Vietnamese PC Hardware store (e.g., real brands like Intel, MSI, Corsair, Western Digital, Kingston, and authentic Vietnamese customer and supplier names).
- **Strict Invariant Maintenance:** All test fixtures and seeds that introduce or modify stock records must preserve the Stock Ledger Invariant (`SRS-INV-02`, `AC-015a`) where current `stock_qty` strictly equals `SUM(inventory_transactions.quantity_change)`.