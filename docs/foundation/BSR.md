# Business Requirements Document (BRD)

> Business requirements (BSR). Markdown copy of MicroLedger_BRD_v3.1.docx for use in the repository and with AI tools. The .docx is the formal copy; if they differ, update this file.

MicroLedger — Responsive Web POS, Inventory & Warranty Tracking \| Version 3.1

| **Version** | **Date**       | **Summary of changes**                                                                                                                                                                                                                                                                                                                                                  |
|-------------|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 3.0         | —              | Initial version.                                                                                                                                                                                                                                                                                                                                                        |
| 3.1         | 3 October 2026 | Technology stack selected (PostgreSQL). Import preview moved to Must Have. Negative stock, duplicate SKU, discount/payment method and sale void defined. Warranty statuses reduced to seven. Priority column and new requirements FR-024 to FR-028 added. Non-functional and UAT targets made measurable. Data model expanded. Delivery phases and decisions log added. |

## 1. Executive Summary

MicroLedger is a lightweight web-based retail management system for small retail businesses that currently rely on Excel and manual processes. Initial product areas are household products, indoor/outdoor electrical products, and furniture.

MicroLedger is one responsive web application usable on PC, tablet and mobile browsers. It combines product management, inventory, simple POS sales, customers, Excel/CSV import/export, reporting, and a warranty tracking workflow. A shared PostgreSQL database behind one API is the single source of truth.

Delivery is phased. Phase 1 delivers the Core (all Must Have items). Phase 2 delivers warranty tracking and the other Should Have items once the Phase 1 exit criteria in §4.5 are met.

## 2. Problem Statement

- Manual Excel stock updates become inconsistent with sales and stock movements.

- Existing Excel data needs a practical import path, and businesses still need to export data.

- Spreadsheets keep no reliable record of who changed stock or prices, or when.

- Retail products can have warranty cases that need customer, supplier/service-provider, status and return-date tracking.

- A lightweight system is preferred over a full ERP or repair-management platform.

## 3. Objectives

- Build one responsive web application.

- Use simple Admin vs Staff roles with server-enforced permissions.

- Manage products, categories, inventory and stock movements with a full movement history.

- Provide POS sales with atomic, automatic inventory deduction and the ability to void a sale.

- Store basic customer name and phone information.

- Support Excel (.xlsx) and CSV import with validation and preview, and export.

- Provide basic supplier information and warranty/claim tracking (Should Have, Phase 2).

- Provide dashboard, defined reports, search/filter and an audit log.

- Evaluate through functional testing and UAT against the measurable targets in §12.

## 4. Scope

### 4.1 Must Have — Core Engine (Phase 1)

- Authentication and user management

- Admin/Staff roles and permissions

- Product and category management

- Inventory quantity tracking with movement history

- Stock-in and stock adjustment (reason required)

- POS cart and sales, with payment method and optional discount

- Automatic stock deduction in the same transaction as the sale

- Sales history and sale void (Admin)

- Basic customer information (name and phone)

- Excel/CSV import with validation and preview; Excel/CSV export

- Dashboard (static "Today / 7-Day" operational snapshot) and dedicated Sales Report (dynamic date-range filtering, dimensional aggregations, void transaction isolation) as defined in §6.1

- Search/filter

- Audit log (user, timestamp, action, record)

### 4.2 Should Have — After Core Works (Phase 2)

- Low-stock visual alert with configurable reorder level (default 5)

- Basic supplier information

- Serial number support

- Warranty information (per-product warranty period)

- Warranty claims and claim status tracking (seven statuses)

- Supplier/service-provider tracking

- Sent date, expected return date, actual return date, overdue calculation

- Customer collection/completion status

- Advanced (combined) filtering

- Warranty report

### 4.3 Could Have

- Barcode scanning

- Supplier purchase orders

- Product images

- Partial returns and refunds

- Unit-price override with Admin approval

- Advanced warranty workflows

- Warranty expiry notifications

- Advanced analytics, including profit and margin reports

### 4.4 Out of Scope

- Accounting and payroll

- Full ERP

- Bank/payment gateway integration

- Tax calculation (selling prices are final prices in v1)

- E-commerce synchronization

- Multi-branch management and multi-currency

- Offline operation

- Complex repair-shop management

- AI forecasting

### 4.5 Delivery Phases and Exit Criteria

| **Phase**                         | **Content**                                                                                                                                    | **Exit criteria**                                                                                                                          |
|-----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| **1 — Core**                      | All Must Have items (§4.1).                                                                                                                    | All Must Have test cases pass. Sale, void, stock-in, adjustment and import tested including a concurrent-sale test. Backup restore tested. |
| **2 — Warranty and enhancements** | Should Have items (§4.2), in this order: low-stock alert, suppliers, warranty, claims and return tracking, serial numbers, advanced filtering. | A claim can be tracked from creation to supplier return to customer collection. All Should Have test cases pass.                           |
| **3 — UAT and hardening**         | UAT per §12, defect fixing, Could Have items only if time remains.                                                                             | UAT pass criteria in §12 met; no open critical or high defects.                                                                            |

### 4.6 Assumptions and Constraints

- One store, one currency, one branch.

- Capacity for planning and testing: up to 10,000 products, about 500 sales per day, up to 5 concurrent users.

- FYP timeline and low-cost hosting; hosting limits are a known constraint (§8.3, §11).

- Existing Excel files are reasonably tabular; the exact layout is confirmed from real samples (O-03).

## 5. Users

| **Role**  | **Responsibilities**                                                                                                                | **Access**                                                                                                |
|-----------|-------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **Admin** | Manage products, categories, inventory adjustments, imports/exports, reports, users, suppliers, sale voids and warranty rejections. | All functions                                                                                             |
| **Staff** | Search products, complete sales, record stock-in, manage customers, view sales history, and handle claims (Should Have).            | Operational functions only. No cost price, no adjustments, no import/export, no void, no user management. |

The full permission matrix is in PRD §3.1 and is enforced on the server for every request.

## 6. Functional Requirements

| **ID** | **Function**           | **Requirement**                                                                                                                                                                              | **Priority** |
|--------|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-001 | Authentication         | Sign in and sign out with username and password. Sessions expire automatically (NFR-05). Account locks for 15 minutes after 5 failed attempts.                                               | Must         |
| FR-002 | Roles                  | Admin and Staff roles. Access follows the permission matrix (PRD §3.1) and is enforced on the server.                                                                                        | Must         |
| FR-003 | Products               | Create, view, update and deactivate products. Products referenced by sales or stock records are never hard-deleted.                                                                          | Must         |
| FR-004 | Categories             | Create, update, view and deactivate categories. A category in use cannot be deleted.                                                                                                         | Must         |
| FR-005 | Product fields         | SKU, name, category, unit, cost price, selling price, stock quantity, status. Should Have fields: reorder level, warranty months, serial-tracked flag.                                       | Must         |
| FR-006 | Inventory              | Display current stock per product and its movement history (type, quantity change, balance after, user, time, reason).                                                                       | Must         |
| FR-007 | Stock-in               | Record received stock (positive whole quantity, optional note) and update quantity.                                                                                                          | Must         |
| FR-008 | Stock adjustment       | Admin changes quantity with a mandatory reason. The result may not be negative.                                                                                                              | Must         |
| FR-009 | POS                    | Search products by name or SKU, choose quantities, build a cart; show subtotal, optional discount and total. Inactive products and quantities above available stock cannot be added.         | Must         |
| FR-010 | Sales                  | Record a completed sale with sale number, user, time, payment method, optional discount and optional customer. Item name, SKU and unit price are stored as a snapshot.                       | Must         |
| FR-011 | Stock deduction        | A completed sale deducts stock in the same database transaction. If any item lacks stock, nothing is recorded.                                                                               | Must         |
| FR-012 | Sales history          | View, search and filter sales by date, user, customer, payment method and status.                                                                                                            | Must         |
| FR-013 | Customers              | Store optional customer name and phone; search by phone or name. A duplicate phone number gives a warning, not a block.                                                                      | Must         |
| FR-014 | Reports                | Dashboard, sales report and inventory report as defined in §6.1.                                                                                                                             | Must         |
| FR-015 | Search/filter          | Search and filter products, sales, customers and inventory records.                                                                                                                          | Must         |
| FR-016 | Import                 | Import products and opening stock from .xlsx and .csv files using the documented template (PRD §9).                                                                                          | Must         |
| FR-017 | Validation and preview | Before commit, show a validation report: new products, updates, errors (row and reason) and warnings. Nothing is saved until the Admin confirms. Commit is a single transaction.             | Must         |
| FR-018 | Export                 | Export products, inventory, sales and selected reports to .xlsx and .csv.                                                                                                                    | Must         |
| FR-019 | Audit                  | Record user, timestamp, action and affected record for the actions in PRD §6 (BR-12). Entries cannot be edited or deleted in the application. Admin can view and filter the log.             | Must         |
| FR-020 | Supplier               | Store basic supplier/service-provider information (name, contact person, phone, email, notes).                                                                                               | Should       |
| FR-021 | Warranty               | Per-product warranty period. Warranty start and expiry are derived from the sale date. Validity is shown as Active or Expired.                                                               | Should       |
| FR-022 | Warranty claim         | Create and track claims: customer, problem, status (seven statuses), supplier, resolution, notes and status history.                                                                         | Should       |
| FR-023 | Return tracking        | Track sent date, expected return date, actual return date, calculated overdue flag and customer collection date.                                                                             | Should       |
| FR-024 | User management        | Admin creates users, assigns roles, deactivates users and resets passwords. Every user can change their own password.                                                                        | Must         |
| FR-025 | Sale void              | Admin voids a completed sale with a mandatory reason. Stock is restored through reversing inventory transactions. The sale stays in history marked Voided and is excluded from sales totals. | Must         |
| FR-026 | Low-stock alert        | Visual alert when stock is at or below the reorder level (default 5, editable per product). Count shown on the dashboard.                                                                    | Should       |
| FR-027 | Serial numbers         | For serial-tracked products, capture serial numbers at sale. Claims can reference a serial number.                                                                                           | Should       |
| FR-028 | Advanced filtering     | Combined multi-field filters across products, sales and claims, with export of the filtered result.                                                                                          | Should       |

### 6.1 Report Definitions (FR-014)

| **Report**                   | **Content**                                                                                                                                          | **Access**                              |
|------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| **Dashboard**                | Static "Today / 7-Day" operational snapshot: Today’s sales total and count, trailing 7-day sales trend, top 5 products (7 days), active stock & category counts, low-stock count (Should), stock value at cost. | Admin: all. Staff: without stock value. |
| **Sales report**             | Dedicated analytical report: dynamic date-range boundaries evaluated relative to container `TZ` (GMT+7), dimensional aggregations (`day`, `product`, `category`, `user`, `payment`), secondary filters (payment method, category, cashier), units sold, subtotal, discount, and net revenue. Voided sales are listed separately and excluded from totals. Profit & margin calculations are out of scope (Could Have) for this phase. | Admin                                   |
| **Inventory report**         | Current stock by product/category, stock value at cost, movement history by date range.                                                              | Admin. Staff see quantities only.       |
| **Warranty report (Should)** | Open claims, overdue claims, claims by supplier.                                                                                                     | Admin, Staff                            |
| **Audit log**                | Filter by user, action and date range.                                                                                                               | Admin                                   |

## 7. Non-Functional Requirements

| **ID** | **Category**               | **Requirement**                                                 | **Measure**                                                                                                                                                                           |
|--------|----------------------------|-----------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| NFR-01 | Usability                  | Common retail tasks are simple and understandable.              | In UAT, at least 90% of staff complete a sale without help; System Usability Scale score of 68 or higher.                                                                             |
| NFR-02 | Performance                | Fast search and checkout at planned capacity (10,000 products). | Product search within 1 s and sale completion within 2 s (95th percentile); page load within 3 s on broadband.                                                                        |
| NFR-03 | Import limits              | Imports are bounded and validated quickly.                      | Maximum 5,000 rows and 5 MB per file; validation report within 30 s for 5,000 rows.                                                                                                   |
| NFR-04 | Responsive design          | Same application on desktop, tablet and mobile.                 | Layouts verified at 360, 768 and 1280 px width on current Chrome, Safari (iOS), Edge and Firefox.                                                                                     |
| NFR-05 | Security — authentication  | Protect accounts and sessions.                                  | HTTPS only; hashed passwords (argon2 or bcrypt); lock after 5 failed attempts for 15 min; access token 15 min, refresh up to 8 h.                                                     |
| NFR-06 | Security — authorization   | Role checks on the server.                                      | Every API endpoint checks role; hiding a button is never the only control.                                                                                                            |
| NFR-07 | Security — input and files | Safe handling of input and files.                               | Parameterized queries; server-side validation; only .xlsx/.csv accepted; size cap; export cells starting with =, +, - or @ are neutralized (spreadsheet formula injection).           |
| NFR-08 | Data integrity             | Sales and inventory stay consistent.                            | Sale, items, stock change, inventory transaction and audit entry in one database transaction; constraints for unique SKU, foreign keys, stock at or above 0; money stored as NUMERIC. |
| NFR-09 | Reliability                | No transaction is silently lost.                                | A failed operation returns a clear error and writes nothing; double-submit protection on sale creation.                                                                               |
| NFR-10 | Backup / recovery          | Data can be restored.                                           | Automated daily backup, 7-day retention, restore tested before UAT; recovery point 24 h, recovery time 1 working day.                                                                 |
| NFR-11 | Privacy                    | Customer and business data protected.                           | Only authenticated users; customer name and phone are not written to application logs.                                                                                                |
| NFR-12 | Auditability               | Important actions are traceable.                                | Append-only audit log with user, UTC timestamp, action, record and details.                                                                                                           |
| NFR-13 | Maintainability            | Consistent, tested code.                                        | Git feature branches, linting and formatting, automated tests covering every business rule (BR-01 to BR-19).                                                                          |
| NFR-14 | Compatibility              | Files open in common tools.                                     | XLSX opens in Excel and LibreOffice; CSV is UTF-8 with BOM so accented characters display correctly.                                                                                  |

## 8. Architecture

### 8.1 Selected Technology Stack

| **Layer**          | **Technology**                                                                                                                                             | **Why**                                                                                                                                                 |
|--------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Frontend**       | Vue 3 (Composition API) + Vite, Vue Router, Pinia, Vuetify 3                                                                                               | Matches current team skill. One responsive single-page app for desktop, tablet and mobile browsers. Vuetify provides a responsive grid and data tables. |
| **Backend / API**  | Node.js (LTS) + Express, REST/JSON, Zod for request validation                                                                                             | All business rules live here. Excel/CSV parsing and validation run on the server, away from the browser UI.                                             |
| **Database**       | PostgreSQL 16 (managed service), node-postgres + Knex.js migrations                                                                                        | ACID transactions for sale + stock, database constraints (unique SKU, foreign keys, non-negative stock), SQL for reports, pg_trgm for product search.   |
| **Authentication** | App-managed: username + password (argon2 or bcrypt), short-lived JWT access token, refresh token in httpOnly secure cookie, role stored in the users table | One identity store in the same database. Simple Admin/Staff checks in API middleware. No second user system to keep in sync.                            |
| **Excel / CSV**    | ExcelJS on the server (XLSX and CSV read/write, streaming reader)                                                                                          | One parsing and validation path for both formats, so FR-017 behaves the same for XLSX and CSV. No client-side parsing.                                  |
| **Hosting**        | Frontend: static host (Firebase Hosting or equivalent). API: Render web service. Database: managed PostgreSQL (for example Supabase or Neon).              | Low cost for an FYP. Provider free-tier limits, sleep behaviour and backup terms must be re-checked before UAT (see §8.3).                              |
| **Tooling**        | Git + GitHub, GitHub Actions (lint + tests), Vitest/Jest + Supertest, Playwright for key flows (optional)                                                  | Supports the maintainability requirement and automated tests of business rules.                                                                         |

### 8.2 Architecture Principles

1.  The browser talks only to the API, never directly to the database.

2.  All business rules live in the API service layer. Database constraints are the backstop, not the only check.

3.  Every operation that changes stock runs in one database transaction.

4.  Stock is reduced with a conditional update that only succeeds if enough stock remains, so two simultaneous sales cannot oversell the last unit.

5.  Money is stored as NUMERIC (never floating point). Timestamps are stored as timestamptz in UTC and evaluated relative to the store time zone. The store time zone (GMT+7 / Vietnam / `Asia/Ho_Chi_Minh`) is managed strictly at the infrastructure level via the Node.js Docker container's `TZ` environment variable (e.g., `TZ=Asia/Ho_Chi_Minh`), with no dynamic database-driven timezone configuration.

6.  Uploaded files are processed in memory or streamed and not kept on disk. Import details are kept in an import log.

7.  Secrets and connection strings are environment variables, never committed to Git.

8.  Database schema changes are versioned migrations in Git.

9.  The frontend relies exclusively on Vuetify 3 component primitives (`v-container`, `v-row`, `v-col`, `v-card`, `v-data-table` / `ResponsiveTable`, `v-btn`, `v-select`, etc.) for all layouts, grids, dialogs, and typography. Raw HTML tables (`<table>`, `<tr>`, `<td>`) and custom scoped CSS layout hacks are strictly prohibited.

10. All database seeds and UAT scenarios strictly model a realistic Vietnamese PC hardware retail store (Intel, MSI, Corsair, WD, Kingston, authentic Vietnamese names and phone numbers). Random string hashes and Faker.js are banned.

### 8.3 Deployment Notes

- Environments: local development and one staging/UAT environment.

- Free API hosting instances stop after a period of inactivity (currently about 15 minutes) and the first request after that is slow. Use an always-on instance, or pre-warm the service, for UAT and demonstrations.

- Free hosting file systems are temporary, which is why uploads are not stored on disk.

- Free database plans differ in storage, expiry and backup features. Confirm the chosen provider’s current terms (O-05) before relying on it for UAT data.

- CORS allows only the frontend origin. Login endpoints are rate-limited.

## 9. Initial Data Model

| **Entity**                        | **Main fields**                                                                                                                                                                     | **Key rules**                                                                                          |
|-----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| **users**                         | id, username, password_hash, full_name, role (admin/staff), status, failed_attempts, locked_until                                                                                   | Unique username. Deactivate, never delete.                                                             |
| **categories**                    | id, name, description, status                                                                                                                                                       | Unique name (case-insensitive).                                                                        |
| **products**                      | id, sku, name, category_id, unit, cost_price, selling_price, stock_qty, status; Should: reorder_level, warranty_months, tracks_serial                                               | Unique SKU among active products. CHECK stock_qty \>= 0. Prices \>= 0.                                 |
| **customers**                     | id, name, phone, created_at                                                                                                                                                         | Optional on sales. Phone searchable.                                                                   |
| **sales**                         | id, sale_no, user_id, customer_id (nullable), sold_at, subtotal, discount_amount, total, payment_method, status (completed/voided), voided_by, voided_at, void_reason               | Unique sale_no. Discount between 0 and subtotal. Never deleted.                                        |
| **sale_items**                    | id, sale_id, product_id, sku_snapshot, name_snapshot, quantity, unit_price, line_total                                                                                              | Quantity \> 0. Snapshot keeps history correct when products change.                                    |
| **inventory_transactions**        | id, product_id, type (opening, stock_in, adjustment, sale, void_reversal), quantity_change, balance_after, reason, reference, user_id, created_at                                   | Append-only ledger. Sum of changes equals stock_qty.                                                   |
| **import_logs**                   | id, user_id, filename, rows_total, rows_valid, rows_error, status, committed_at                                                                                                     | One record per import attempt.                                                                         |
| **audit_logs**                    | id, user_id, action, entity_type, entity_id, details (JSON), created_at                                                                                                             | Append-only.                                                                                           |
| **suppliers (Should)**            | id, name, contact_person, phone, email, notes, status                                                                                                                               | Deactivate, never delete if referenced.                                                                |
| **warranties (Should)**           | id, sale_item_id (nullable), product_id, customer_id (nullable), serial_no, start_date, expiry_date, source (sale/manual)                                                           | Created at sale for products with warranty_months \> 0. Active/Expired is calculated from expiry_date. |
| **warranty_claims (Should)**      | id, claim_no, warranty_id, customer_id, claim_date, problem, status, supplier_id (nullable), sent_date, expected_return_date, actual_return_date, collected_date, resolution, notes | Customer required. Status rules in §10. Overdue is calculated, not stored.                             |
| **claim_status_history (Should)** | id, claim_id, from_status, to_status, user_id, note, created_at                                                                                                                     | One row per status change.                                                                             |

## 10. Warranty Workflow (Should Have)

1.  Customer reports a product problem during warranty.

2.  Staff finds the original sale or product and checks warranty validity (Active or Expired).

3.  Staff creates a warranty claim for a customer (status Submitted).

4.  If the product goes to a supplier or service provider, staff selects the supplier and records the sent date and expected return date (status With Supplier).

5.  The claim shows how many days the product has been away and whether it is overdue.

6.  On return, the actual return date and resolution are recorded (status Returned).

7.  When the product is ready in store, status becomes Ready for Customer.

8.  When the customer collects it, the collection date is recorded (status Completed).

9.  Admin may Reject or Cancel a claim with a reason.

### Workflow rules

- Warranty expiry = sale date + product warranty months. A claim is valid if the claim date is on or before the expiry date. Admin may accept an out-of-warranty claim with a note.

- Overdue = status is With Supplier, no actual return date, and expected return date is before today. It is calculated, not stored.

- Required fields by status: With Supplier needs supplier, sent date and expected return date; Returned needs actual return date and resolution; Completed needs collection date.

**Claim statuses**

| **Status**             | **Meaning**                                                                                            |
|------------------------|--------------------------------------------------------------------------------------------------------|
| **Submitted**          | Claim recorded; not yet sent anywhere. Initial status.                                                 |
| **With Supplier**      | Product sent to a supplier or service provider. Requires supplier, sent date and expected return date. |
| **Returned**           | Product received back from the supplier. Requires actual return date and a resolution.                 |
| **Ready for Customer** | Product (or replacement) is in store and the customer can collect it.                                  |
| **Completed**          | Customer collected the product. Requires collection date. Final.                                       |
| **Rejected**           | Claim declined, for example out of warranty or customer damage. Admin only; reason required. Final.    |
| **Cancelled**          | Claim withdrawn or created in error. Admin only; reason required. Final.                               |

## 11. Risks & Controls

| **Risk**                                          | **Control**                                                                                                                  |
|---------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| **Messy Excel files**                             | Template, column mapping, validation report and preview before commit (all Must Have).                                       |
| **Incorrect imported stock**                      | Import never overwrites stock of existing products; opening stock applies to new products only; summary shown before commit. |
| **Sale/stock inconsistency or overselling**       | One database transaction per sale; conditional stock update; CHECK constraint; concurrent-sale test.                         |
| **Data loss**                                     | Automated daily backup, 7-day retention, restore tested before UAT.                                                          |
| **Free hosting sleeps or restarts**               | Always-on instance or pre-warm for UAT and demos; no data kept on the API file system.                                       |
| **Spreadsheet formula injection through exports** | Neutralize cells starting with =, +, - or @ on export.                                                                       |
| **Unauthorized access**                           | Server-side role checks, lockout, short sessions, HTTPS, rate-limited login.                                                 |
| **Warranty becomes repair-shop software**         | Limit to retailer-side claim, supplier, status and dates; seven statuses only.                                               |
| **Scope grows too large**                         | Strict Must/Should/Could, locked out-of-scope list, phase exit criteria.                                                     |

## 12. Success Criteria

- A valid 500-row .xlsx or .csv file imports with correct counts; a file with invalid rows shows each error with row number and reason and saves nothing until the Admin confirms.

- A completed sale reduces stock by exactly the quantities sold; a sale larger than stock is blocked; two simultaneous sales of the last unit result in exactly one success.

- Voiding a sale restores stock and removes the sale from totals.

- Admin can inspect products, stock, sales and the defined reports; Staff cannot access cost price, import, export or user management.

- Exports open in Excel/LibreOffice without errors; cells that look like formulas are neutralized.

- Every audited action has a user and timestamp.

- If implemented, a warranty claim can be tracked from creation through supplier return to customer collection, with overdue shown correctly.

### UAT plan

- Participants: at least 1 Admin and 2 Staff users (final names in O-06).

- Data: a sample dataset of at least 500 products, built from real or realistic Excel files.

- Pass criteria: 100% of Must Have test cases pass; at least 90% of Should Have test cases pass; no open critical or high defects; SUS score of 68 or higher.

- Performance targets in NFR-02 and NFR-03 are measured in the staging environment.

## 13. Decisions Log

Decisions marked “Proposed – confirm” are recommended defaults chosen in v3.1 to close gaps in v3.0. Confirm them with the supervisor or client before development. Items marked “Open” still need an answer.

| **ID** | **Decision / open item**                                                                                                                                                                                                         | **Status**         |
|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| D-01   | Database is PostgreSQL.                                                                                                                                                                                                          | Decided            |
| D-02   | Rest of technology stack as listed in BRD §8 (Vue 3, Node/Express, ExcelJS, app-managed JWT auth, Render + static hosting).                                                                                                      | Proposed – confirm |
| D-03   | Negative stock is not allowed anywhere. A sale with insufficient stock is blocked; an adjustment cannot go below zero.                                                                                                           | Proposed – confirm |
| D-04   | SKU is unique among active products (trimmed, case-insensitive). On import, a matching SKU updates the product; stock is never overwritten by import.                                                                            | Proposed – confirm |
| D-05   | No tax calculation in v1: selling prices are final prices. Optional fixed-amount discount per sale. Payment method is recorded (Cash, Card, Bank transfer, Other); no payment gateway.                                           | Proposed – confirm |
| D-06   | Sale void by Admin is Must Have. Partial returns/refunds are Could Have.                                                                                                                                                         | Proposed – confirm |
| D-07   | Import preview (validation report before commit) is Must Have, so FR-017 can be met.                                                                                                                                             | Proposed – confirm |
| D-08   | Seven warranty statuses (see PRD §7). Overdue is calculated, not a status. Repair details beyond status, dates and resolution are out of scope.                                                                                  | Proposed – confirm |
| D-09   | Warranty period is set per product (months, default 0 = no warranty). Warranty starts on the sale date.                                                                                                                          | Proposed – confirm |
| D-10   | Serial numbers are optional per product (serial-tracked flag) and Should Have.                                                                                                                                                   | Proposed – confirm |
| D-11   | A claim may exist without a supplier (in-store resolution). Supplier, sent date and expected return date are required to enter With Supplier.                                                                                    | Proposed – confirm |
| D-12   | A claim requires a customer (name + phone). A sale without a customer needs one attached before a claim is created. Claims for goods with no sale record (for example migrated stock) are created by Admin as manual warranties. | Proposed – confirm |
| D-13   | Staff cannot see cost price, adjust stock, import, export, void sales or manage users (see permission matrix, PRD §3.1).                                                                                                         | Proposed – confirm |
| D-14   | Backup: automated daily database backup, 7-day retention, restore tested once before UAT.                                                                                                                                        | Proposed – confirm |
| D-15   | Performance, capacity and UAT targets as listed in BRD §7 and §12.                                                                                                                                                               | Proposed – confirm |
| O-01   | Currency and number of decimal places (single currency assumed).                                                                                                                                                                 | Open               |
| O-02   | Store time zone used for dates, reports and overdue calculation.                                                                                                                                                                 | Closed – Fixed to GMT+7 (Asia/Ho_Chi_Minh) via infrastructure-level `TZ` environment variable in the Node.js Docker container (dynamic DB-driven setting removed). |
| O-03   | Real sample of the client’s existing Excel files, to finalise the import template and column mapping.                                                                                                                            | Open               |
| O-04   | Hosting plan for UAT and demo (paid always-on API instance versus free instance with pre-warm).                                                                                                                                  | Open               |
| O-05   | Managed PostgreSQL provider and plan; confirm current free-tier limits and backup features.                                                                                                                                      | Open               |
| O-06   | UAT participants, dates and sample dataset size.                                                                                                                                                                                 | Open               |
| O-07   | Whether Staff should be allowed to record stock-in (currently Yes).                                                                                                                                                              | Open               |
| D-16   | Store settings (currency, decimals) as a Must Have feature (SRS-SET-01); store time zone (GMT+7) strictly managed at infrastructure level via container `TZ` environment variable. Reports and overdue calculations evaluate dates relative to container `TZ`. | Decided            |
| D-17   | User security architecture: refresh_tokens table, must_change_password flag, per-request role check, and 8–128 character password policy (SRS-AUTH-02, 05, 07, 10).                                                              | Decided            |
| D-18   | Import workflow: import_logs stores parsed payload and expires after 60 minutes. Uploaded files streamed in memory and never stored on disk (SRS-IMP-01 to 08).                                                                  | Decided            |
| D-19   | Sales price integrity: Prices never sent by client; server uses current selling_price snapshot. Max 100 lines per sale. Idempotency-Key required (SRS-SAL-01, 03, 08).                                                          | Decided            |
| D-20   | Void integrity: Sale with active claim cannot be voided; warranties of voided sale cannot be claimed; serials released on void (SRS-VOID-05, SRS-SER-01).                                                                      | Decided            |
| D-21   | Warranty structure: Warranties created per serial or sale item; customer attached to warranty; sales records immutable (SRS-WAR-01, 06; SRS-SAL-12).                                                                            | Decided            |
| D-22   | Export safeguards: Export row limit capped at 50,000 rows. CSV exports prefix formula characters (=, +, -, @) with single quote (SRS-EXP-02, 04).                                                                               | Decided            |
| D-23   | Preservation of business history: Products and customers are deactivated or retained, never hard-deleted (SRS-PRD-05, SRS-CUS-04).                                                                                              | Decided            |
| D-24   | Append-only database enforcement: PostgreSQL database role app_user has UPDATE and DELETE explicitly REVOKED on audit_logs and inventory_transactions (SRS-AUD-03).                                                               | Decided            |
| D-25   | API rate limiting: Login endpoint throttled at 10 requests/min; other endpoints throttled at 300 requests/min per IP (SRS §4.2).                                                                                                | Decided            |

## 14. SRS Additions Sync (Appendix A)

The 10 architectural and business rule additions identified in SRS v1.0 Appendix A (A-01 through A-10) have been reconciled and synced into this BRD specification under decisions D-16 through D-25.
