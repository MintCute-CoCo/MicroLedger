# Software Requirements Specification (SRS)

> Markdown copy of MicroLedger_SRS_v1.0.docx for use in the repository and with AI tools. The .docx is the formal copy; if they differ, update this file.

MicroLedger — Responsive Web POS, Inventory & Warranty Tracking \| Version 1.0 (baseline: BRD v3.1, PRD v3.1)

| **Version** | **Date**       | **Summary**                                                                                                                                                                                                                                           |
|-------------|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1.0         | 3 October 2026 | First SRS. Turns BRD v3.1 and PRD v3.1 into verifiable software requirements: detailed behaviour, API, data dictionary, state models, error catalogue and verification traceability. Items this SRS adds beyond the BRD/PRD are listed in Appendix A. |

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements of MicroLedger precisely enough for design, implementation and testing. It is written for the developer (FYP student), the supervisor/assessor and the testers. The BRD explains why the system is needed; the PRD explains how it should behave for users; this SRS states what the software shall do and how each statement is verified.

### 1.2 Scope

MicroLedger is a responsive web application for a single small retail store. It manages products, categories, inventory, POS sales, customers, Excel/CSV import and export, reports, an audit log and (Should Have) suppliers and warranty claims. It does not include accounting, tax calculation, payment gateways, multi-branch operation, offline mode or repair-shop management (see BRD §4.4).

### 1.3 Definitions

| **Term**                     | **Definition**                                                                                                                                              |
|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Admin / Staff**            | The two user roles. Permissions are in PRD §3.1.                                                                                                            |
| **SKU**                      | Stock keeping unit: the product code, unique among active products.                                                                                         |
| **POS**                      | Point of sale: the screen and API used to record a sale.                                                                                                    |
| **Opening stock**            | Stock quantity given to a new product at creation or import. Recorded as an inventory transaction of type opening.                                          |
| **Inventory transaction**    | One append-only ledger row for every change of a product’s stock.                                                                                           |
| **Voided**                   | A completed sale cancelled by an Admin. It stays in history but is excluded from totals.                                                                    |
| **Idempotency key**          | A client-generated unique value sent with a sale request so a retry or double tap cannot create two sales.                                                  |
| **Store time zone**          | The IANA time zone configured at the infrastructure level via the Node.js Docker container's TZ environment variable (e.g., Asia/Ho_Chi_Minh or Asia/Bangkok). All dates shown to users, report boundaries and overdue checks use it. Timestamps are stored in UTC. |
| **Overdue**                  | A claim in status With Supplier with no actual return date and an expected return date before today (store time zone).                                      |
| **FYP, UAT, ACID, JWT, API** | Final year project; user acceptance testing; atomicity-consistency-isolation-durability; JSON Web Token; application programming interface.                 |

### 1.4 References

- MicroLedger BRD v3.1 (FR-001 to FR-028, NFR-01 to NFR-14, decisions D-01 to D-15, open items O-01 to O-07).

- MicroLedger PRD v3.1 (permission matrix, business rules BR-01 to BR-19, import template, warranty transitions, acceptance criteria).

### 1.5 Conventions

- Requirement IDs have the form SRS-AREA-nn. “Shall” marks a mandatory requirement; each requirement is testable.

- Priority follows the BRD: Must (Phase 1) or Should (Phase 2). The “Traces to” column links to BRD requirements (FR, NFR), PRD business rules (BR) or decisions (D).

- Where this SRS and the BRD/PRD differ, the BRD/PRD must be updated to match; see Appendix A.

## 2. Overall Description

### 2.1 Product Perspective

MicroLedger is a new, self-contained system that replaces Excel-based stock and sales tracking. It has three runtime components.

| **Component**                          | **Responsibility**                                                                                                                                                          |
|----------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Web client (Vue 3 single-page app)** | Presentation, navigation, client-side input checks, cart handling. Holds the access token in memory only. Contains no business rules that are not also enforced by the API. |
| **API server (Node.js + Express)**     | Authentication, authorization, request validation, all business rules, database transactions, Excel/CSV parsing and generation, reports, audit logging.                     |
| **PostgreSQL 16 database**             | Persistent storage, constraints (unique, foreign key, CHECK), sequences for sale and claim numbers.                                                                         |
| **Scheduled backup job**               | Daily database backup with 7-day retention (NFR-10).                                                                                                                        |

### 2.2 Product Functions

- **Phase 1 (Must):** login and users, products and categories, inventory with ledger, stock-in and adjustment, POS sales, sale void, customers, import with preview, export, dashboard and reports, search, audit log, store settings.

- **Phase 2 (Should):** low-stock alert, suppliers, warranties, claims and return tracking, serial numbers, advanced filtering.

### 2.3 User Classes

| **Class** | **Description**                                                                 | **Technical skill**                 |
|-----------|---------------------------------------------------------------------------------|-------------------------------------|
| **Admin** | Store owner or manager. Full access to configuration, data and reports.         | Moderate; uses Excel.               |
| **Staff** | Counter employee. Sells, receives stock, looks up customers and handles claims. | Basic; mobile or tablet use likely. |

### 2.4 Operating Environment

- Clients: latest two major versions of Chrome, Edge, Firefox and Safari (macOS and iOS), on screens from 360 px wide.

- Server: Node.js current LTS, PostgreSQL 16, HTTPS-only hosting.

- Hosting: static frontend host, Render web service for the API, managed PostgreSQL (BRD §8).

### 2.5 Design and Implementation Constraints

- The browser shall communicate only with the API, never directly with the database.

- All parsing and validation of Excel/CSV files shall run on the server using ExcelJS.

- Money shall be stored as NUMERIC(12,2); timestamps as TIMESTAMPTZ in UTC.

- The API shall not store uploaded files on the file system (temporary on free hosting).

- Secrets shall be supplied only through environment variables.

- Capacity planning assumptions: up to 10,000 products, about 500 sales per day, up to 5 concurrent users.

### 2.6 Assumptions and Dependencies

- One store, one currency, one branch (BRD §4.6).

- Open items O-01 to O-07 are answered before the related feature is built. Defaults used meanwhile are stated where they matter.

- Existing Excel files are tabular; the final template is checked against real samples (O-03).

- Hosting free-tier limits and backup terms are confirmed before UAT (O-04, O-05).

## 3. Functional Requirements

Requirements are grouped by feature area. Descriptions of multi-step processing follow the tables.

### 3.1 Authentication and Authorization

| **ID**      | **Requirement**                                                                                                                                                                                                                           | **Priority** | **Traces to**  |
|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|----------------|
| SRS-AUTH-01 | The system shall authenticate a user by username (case-insensitive) and password.                                                                                                                                                         | Must         | FR-001         |
| SRS-AUTH-02 | On successful login the API shall return a JWT access token valid for 15 minutes and set a refresh token (random value, stored only as a hash) valid for 8 hours in an httpOnly, Secure, SameSite=Strict cookie limited to the auth path. | Must         | FR-001, NFR-05 |
| SRS-AUTH-03 | After 5 consecutive failed logins for a username the account shall be locked for 15 minutes. While locked, login shall fail with AUTH_LOCKED even if the password is correct. A successful login shall reset the counter.                 | Must         | FR-001, BR-12  |
| SRS-AUTH-04 | The error for an unknown username and for a wrong password shall be identical (no account enumeration).                                                                                                                                   | Must         | NFR-05         |
| SRS-AUTH-05 | Using the refresh endpoint shall issue a new access token and a new refresh token and invalidate the old refresh token. Expired or revoked refresh tokens shall be rejected.                                                              | Must         | NFR-05         |
| SRS-AUTH-06 | Logout shall revoke the current refresh token and clear the cookie.                                                                                                                                                                       | Must         | FR-001         |
| SRS-AUTH-07 | On every request the API shall load the user’s current role and status from the database. A deactivated user shall receive 401 and all that user’s refresh tokens shall be revoked.                                                       | Must         | FR-002, FR-024 |
| SRS-AUTH-08 | Every endpoint shall declare its allowed roles. A request from another role shall return 403 AUTH_FORBIDDEN and change nothing.                                                                                                           | Must         | FR-002, NFR-06 |
| SRS-AUTH-09 | Responses to Staff shall not contain cost_price, stock value or profit data. The serializer shall omit these fields; the UI hiding them is not sufficient.                                                                                | Must         | D-13           |
| SRS-AUTH-10 | Passwords shall be 8 to 128 characters and different from the username. They shall be stored using argon2id (or bcrypt with cost 12 or higher).                                                                                           | Must         | NFR-05         |
| SRS-AUTH-11 | The first Admin account shall be created by a seed script that reads credentials from environment variables. No default password shall exist in code or migrations.                                                                       | Must         | NFR-05         |

### 3.2 User Management

| **ID**     | **Requirement**                                                                                                                                                                                                                                  | **Priority** | **Traces to** |
|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|---------------|
| SRS-USR-01 | An Admin shall create a user with username (3 to 50 characters from a–z, 0–9, dot, underscore, hyphen; unique), full name, role and initial password. The new user shall be forced to change the password at first login (must_change_password). | Must         | FR-024        |
| SRS-USR-02 | An Admin shall deactivate or reactivate a user and change a user’s role. Users shall never be deleted.                                                                                                                                           | Must         | FR-024        |
| SRS-USR-03 | The system shall reject deactivating or demoting the last active Admin, and an Admin deactivating their own account.                                                                                                                             | Must         | FR-024        |
| SRS-USR-04 | An Admin shall reset a user’s password to a new temporary password. This sets must_change_password and revokes that user’s refresh tokens.                                                                                                       | Must         | FR-024        |
| SRS-USR-05 | Any user shall change their own password by providing the current password. Other refresh tokens of that user shall be revoked.                                                                                                                  | Must         | FR-024        |

### 3.3 Categories and Products

| **ID**     | **Requirement**                                                                                                                                                                                                                                                                         | **Priority** | **Traces to**  |
|------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|----------------|
| SRS-CAT-01 | An Admin shall create, rename and deactivate categories. The name shall be 1 to 100 characters and unique ignoring case. Categories shall not be deleted.                                                                                                                               | Must         | FR-004         |
| SRS-CAT-02 | A category that still has active products shall not be deactivated. Inactive categories shall not be selectable for new products but shall display on existing records.                                                                                                                 | Must         | FR-004         |
| SRS-PRD-01 | An Admin shall create a product with required sku, name, category and selling_price. Defaults: unit pcs, cost_price 0, reorder_level 5, warranty_months 0, tracks_serial false, status active. An optional opening stock shall be recorded as an inventory transaction of type opening. | Must         | FR-003, FR-005 |
| SRS-PRD-02 | SKU shall be trimmed, 1 to 50 characters, and unique among active products ignoring case. A duplicate shall be rejected with SKU_DUPLICATE.                                                                                                                                             | Must         | BR-01, D-04    |
| SRS-PRD-03 | An Admin shall update name, category, unit, prices, reorder_level, warranty_months, tracks_serial and status. Stock quantity shall not be changeable through product update; it changes only through inventory operations, sales, voids and imports.                                    | Must         | FR-003, BR-05  |
| SRS-PRD-04 | A change of cost_price or selling_price shall write an audit entry containing the old and new values.                                                                                                                                                                                   | Must         | BR-12          |
| SRS-PRD-05 | Products shall be deactivated, not deleted. Deactivating a product with stock above 0 shall require a confirmation flag from the client. Reactivation shall be rejected with SKU_DUPLICATE if another active product uses the SKU.                                                      | Must         | BR-01, BR-06   |
| SRS-PRD-06 | Product lists shall support search (partial, case-insensitive match on SKU or name), filters (category, status), sorting (name, SKU, stock) and pagination.                                                                                                                             | Must         | FR-015         |
| SRS-PRD-07 | Product lookup for the POS shall rank results: exact SKU, SKU prefix, name prefix, then other matches, and return at most 20 active products.                                                                                                                                           | Must         | FR-009         |

### 3.4 Inventory

| **ID**     | **Requirement**                                                                                                                                                                                                                                                                    | **Priority** | **Traces to**        |
|------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|----------------------|
| SRS-INV-01 | Current stock shall be stored in products.stock_qty. Every change to it shall write exactly one inventory transaction (signed quantity_change and balance_after) in the same database transaction.                                                                                 | Must         | FR-006, NFR-08       |
| SRS-INV-02 | For every product, stock_qty shall equal the sum of its inventory transaction quantity_change values. A verification query for this shall exist and run in automated tests.                                                                                                        | Must         | NFR-08               |
| SRS-INV-03 | Stock-in shall require an active product and a positive whole quantity (maximum 1,000,000) and accept an optional note up to 255 characters. Admin and Staff may record stock-in.                                                                                                  | Must         | FR-007, BR-03, O-07  |
| SRS-INV-04 | An Admin shall adjust stock by giving either a new quantity (0 or more) or a signed change, plus a reason of 1 to 255 characters. The current quantity shall be read under a row lock. A result below zero shall be rejected with NEGATIVE_STOCK. A zero change shall be rejected. | Must         | FR-008, BR-04, BR-05 |
| SRS-INV-05 | The movement history of a product shall list inventory transactions newest first with filters for type and date range, paginated.                                                                                                                                                  | Must         | FR-006               |
| SRS-INV-06 | The inventory list shall show stock per product with category filter and search. For Staff it shall omit cost and stock value.                                                                                                                                                     | Must         | FR-006, D-13         |

### 3.5 POS and Sales

| **ID**     | **Requirement**                                                                                                                                                                                                         | **Priority** | **Traces to**         |
|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|-----------------------|
| SRS-SAL-01 | A sale request shall contain items (product_id, quantity), payment_method, and optionally discount_amount and customer_id. The client shall not send prices; the server shall use the product’s current selling_price.  | Must         | FR-009, FR-010, BR-08 |
| SRS-SAL-02 | The server shall merge repeated products into one line, require at least 1 and at most 100 lines, and require whole quantities of 1 or more.                                                                            | Must         | FR-010                |
| SRS-SAL-03 | The sale request shall carry an Idempotency-Key header. A repeated key shall return the original sale and create nothing new.                                                                                           | Must         | NFR-09                |
| SRS-SAL-04 | A sale shall be rejected with PRODUCT_INACTIVE if any product is inactive, and with INSUFFICIENT_STOCK (naming the product and available quantity) if any quantity exceeds stock. In both cases nothing shall be saved. | Must         | FR-011, BR-02, BR-06  |
| SRS-SAL-05 | The discount shall be between 0 and the subtotal. Total shall equal subtotal minus discount. Payment method shall be one of cash, card, bank_transfer, other.                                                           | Must         | BR-09, BR-10          |
| SRS-SAL-06 | The sale number shall come from a database sequence formatted S- followed by at least 6 digits, and shall be unique.                                                                                                    | Must         | FR-010                |
| SRS-SAL-07 | Each sale item shall store sku, name and unit price as a snapshot so later product changes do not alter history.                                                                                                        | Must         | FR-010, BR-08         |
| SRS-SAL-08 | A sale shall be processed as one database transaction following §3.12.1. A failure at any step shall roll back all changes.                                                                                             | Must         | FR-011, NFR-08        |
| SRS-SAL-09 | Completing a sale shall write one audit entry.                                                                                                                                                                          | Must         | BR-12                 |
| SRS-SAL-10 | The POS screen shall check quantities and totals for fast feedback, but the server result is authoritative. On a server rejection the cart shall be kept and the reason shown.                                          | Must         | FR-009                |
| SRS-SAL-11 | Sales history shall support search by sale number and filters for date range, user, customer, payment method and status, paginated. Staff shall see no cost data.                                                       | Must         | FR-012                |
| SRS-SAL-12 | Sales and sale items shall be immutable. The only permitted change to a sale is a void (§3.7).                                                                                                                          | Must         | BR-12                 |

### 3.6 Customers

| **ID**     | **Requirement**                                                                                                                                                       | **Priority** | **Traces to**  |
|------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|----------------|
| SRS-CUS-01 | Admin and Staff shall create and update customers. Name is required (1 to 100 characters); phone is optional (5 to 30 characters: digits, spaces, +, -, parentheses). | Must         | FR-013         |
| SRS-CUS-02 | Customers shall be searchable by partial name or phone.                                                                                                               | Must         | FR-013, FR-015 |
| SRS-CUS-03 | Creating a customer whose phone already exists shall succeed and return a warning listing the existing customer. It shall not block.                                  | Must         | FR-013         |
| SRS-CUS-04 | Customers shall not be deleted in v1.                                                                                                                                 | Must         | FR-013         |

### 3.7 Sale Void

| **ID**      | **Requirement**                                                                                                                                                            | **Priority** | **Traces to**  |
|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|----------------|
| SRS-VOID-01 | Only an Admin shall void a sale. A reason of 1 to 255 characters is required.                                                                                              | Must         | FR-025, BR-11  |
| SRS-VOID-02 | Voiding shall run as one transaction following §3.12.2: mark the sale voided, restore stock for every item, write void_reversal inventory transactions and an audit entry. | Must         | FR-025, NFR-08 |
| SRS-VOID-03 | A sale already voided shall be rejected with SALE_ALREADY_VOIDED.                                                                                                          | Must         | BR-11          |
| SRS-VOID-04 | Stock shall be restored even if the product is now inactive.                                                                                                               | Must         | FR-025         |
| SRS-VOID-05 | A sale that has a claim not in status Cancelled shall not be voided (SALE_HAS_CLAIMS). Warranties from a voided sale shall not be usable for new claims.                   | Should       | FR-025, FR-022 |
| SRS-VOID-06 | Dashboard, reports and exports shall exclude voided sales from totals and list them separately where relevant.                                                             | Must         | BR-11          |

### 3.8 Import

| **ID**     | **Requirement**                                                                                                                                                                                                                                                                  | **Priority** | **Traces to**  |
|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|----------------|
| SRS-IMP-01 | An Admin shall upload a .xlsx or .csv file to a preview endpoint. The extension and file signature shall be checked. Files over 5 MB or 5,000 data rows shall be rejected (IMPORT_LIMIT_EXCEEDED); other types shall be rejected (IMPORT_FILE_TYPE).                             | Must         | FR-016, NFR-03 |
| SRS-IMP-02 | The server shall parse the first worksheet (or the CSV) with ExcelJS streaming, match headers to template columns ignoring case and surrounding spaces, and accept an optional column mapping for unmatched headers. Missing required columns shall reject the file.             | Must         | FR-016         |
| SRS-IMP-03 | Every row shall be classified as new, update or error and may carry warnings, using the validation rules in PRD §9.2 and the template in PRD §9.1. String values shall be trimmed; formula cells use their stored result; numbers with currency symbols or text shall be errors. | Must         | FR-017, BR-13  |
| SRS-IMP-04 | The preview shall be stored in import_logs (status previewed, validated rows as JSON, expiry 60 minutes after creation). The response shall give the summary (total, new, update, error, warning counts) and paged row results, and an error report downloadable as CSV.         | Must         | FR-017         |
| SRS-IMP-05 | The commit request shall name the import and a mode: all or valid_only. In mode all, any error row shall reject the commit (IMPORT_HAS_ERRORS).                                                                                                                                  | Must         | FR-017         |
| SRS-IMP-06 | Commit shall run as one transaction following §3.12.3. New products shall get an opening inventory transaction when opening_stock is above 0. Existing SKUs shall be updated but their stock shall never change.                                                                 | Must         | BR-13, D-04    |
| SRS-IMP-07 | Inside the commit transaction SKU uniqueness shall be checked again. A conflict created since the preview shall be reported as an error: the whole commit fails in mode all, and the rows are skipped in mode valid_only.                                                        | Must         | FR-017, BR-01  |
| SRS-IMP-08 | An import that is already committed, cancelled or expired shall not be committed (IMPORT_ALREADY_COMMITTED, IMPORT_EXPIRED).                                                                                                                                                     | Must         | FR-017         |
| SRS-IMP-09 | The system shall offer the template as .xlsx and .csv with headers and one example row.                                                                                                                                                                                          | Must         | FR-016         |
| SRS-IMP-10 | Uploaded files shall be processed from memory or stream and never written to disk. After commit or expiry the stored row payload shall be cleared, keeping counts only.                                                                                                          | Must         | NFR-11         |

### 3.9 Export

| **ID**     | **Requirement**                                                                                                                                                                                                                  | **Priority** | **Traces to** |
|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|---------------|
| SRS-EXP-01 | An Admin shall export products, inventory, sales (date range required) and reports as .xlsx or .csv using the same filters as the screens.                                                                                       | Must         | FR-018        |
| SRS-EXP-02 | An export shall be limited to 50,000 rows. A larger request shall be rejected with EXPORT_TOO_LARGE and the user asked to narrow the filters.                                                                                    | Must         | NFR-02        |
| SRS-EXP-03 | CSV exports shall be UTF-8 with a BOM, comma separated, CRLF line ends, with quoting per RFC 4180.                                                                                                                               | Must         | NFR-14        |
| SRS-EXP-04 | Text values beginning with =, +, -, @, tab or carriage return shall be neutralized: written as string-type cells in .xlsx and prefixed with a single quote in .csv. Numeric columns shall be written as numbers and not altered. | Must         | NFR-07        |
| SRS-EXP-05 | Each export shall write an audit entry with the export type, filters and row count.                                                                                                                                              | Must         | BR-12         |

### 3.10 Reports and Dashboard

| **ID**     | **Requirement**                                                                                                                                                                                                                                                                        | **Priority** | **Traces to**  |
|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|----------------|
| SRS-RPT-01 | The dashboard shall show a static operational snapshot: total and count of completed sales for today; daily totals for the trailing 7 days; top 5 products by quantity sold in the trailing 7 days; low-stock count (Should); and, for Admin only, stock value at cost (sum of stock_qty × cost_price over active products). Dynamic date range filtering and dimensional breakdown are exclusively relegated to the dedicated Sales Report module (SRS-RPT-02). | Must         | FR-014         |
| SRS-RPT-02 | The sales report shall provide dedicated dynamic reporting with date range filtering (From/To dates), user, category, product and payment method filters, and grouping by day, product, category, user or payment method, showing units sold, subtotal, discount, and net revenue. Voided sales shall be listed separately and excluded from revenue totals. Profit & margin calculations and cost-price tracking in sales reports are out of scope (Could Have) for this phase. | Must         | FR-014         |
| SRS-RPT-03 | The inventory report shall show current stock by product and category, stock value at cost (Admin), and movement history for a date range.                                                                                                                                             | Must         | FR-014         |
| SRS-RPT-04 | The warranty report shall show claim counts by status, the overdue claims list and claims by supplier.                                                                                                                                                                                 | Should       | FR-014, FR-023 |
| SRS-RPT-05 | All date boundaries (today, date ranges) shall use the store time zone configured at the infrastructure level via the Node.js container's `TZ` environment variable (e.g. `TZ=Asia/Ho_Chi_Minh` or `Asia/Bangkok`). Screen figures and exported figures shall be identical for the same filters.                                                                                                                                   | Must         | O-02           |
| SRS-RPT-06 | Report access shall follow the permission matrix: Staff see the dashboard without stock value, and the warranty report.                                                                                                                                                                | Must         | D-13           |

### 3.11 Audit Log and Store Settings

| **ID**     | **Requirement**                                                                                                                                                                                                               | **Priority** | **Traces to**     |
|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|-------------------|
| SRS-AUD-01 | The system shall write an audit entry for every action listed in BR-12 with user, action code, entity type, entity id, details (JSON) and UTC timestamp.                                                                      | Must         | FR-019, BR-12     |
| SRS-AUD-02 | An audit entry shall be written in the same transaction as the action it records, so both succeed or both fail. Exception: login lockout, which is written on its own.                                                        | Must         | FR-019, NFR-12    |
| SRS-AUD-03 | The database role used by the API shall have only INSERT and SELECT rights on audit_logs and inventory_transactions, so the application cannot edit or delete them.                                                           | Must         | FR-019, BR-12     |
| SRS-AUD-04 | An Admin shall view the audit log with filters for user, action, entity and date range, paginated.                                                                                                                            | Must         | FR-019            |
| SRS-AUD-05 | Audit details shall never contain passwords, password hashes or tokens.                                                                                                                                                       | Must         | NFR-11            |
| SRS-SET-01 | An Admin shall view and change store settings: currency code (ISO 4217) and currency decimal places (0 to 2). Application timezone is handled at the infrastructure level via the Node.js Docker container's `TZ` environment variable (removing dynamic DB-driven timezone setting). Changes shall be audited. | Must         | BR-18, O-01, O-02 |

### 3.12 Processing Sequences

#### 3.12.1 Complete a sale

1.  Validate the request (SRS-SAL-01, -02, -05). Reject with VALIDATION_FAILED if invalid.

2.  Begin a transaction. Look up the idempotency key; if found, return the stored sale.

3.  Sort lines by product_id. For each line run a conditional update: reduce stock_qty by the quantity where the product is active and stock_qty is at least the quantity; return the new stock, selling price, SKU, name and warranty months.

4.  If any update changes no row, roll back and return PRODUCT_INACTIVE or INSUFFICIENT_STOCK for that product.

5.  Insert the sale (sequence number, user, totals, payment method, idempotency key) and its items with snapshots.

6.  Insert one inventory transaction per line (type sale, negative change, balance_after from step 3).

7.  Phase 2: for products with warranty months above 0 insert warranty records and, for serial-tracked products, serial numbers (SRS-WAR-01, SRS-SER-01).

8.  Insert the audit entry. Commit. Return the sale.

Sorting lines by product_id in step 3 keeps lock order the same for all sales and avoids deadlocks.

#### 3.12.2 Void a sale

1.  Begin a transaction and lock the sale row. Reject if already voided or (Phase 2) it has an active claim.

2.  Set status voided with user, time and reason.

3.  For each item add the quantity back to the product’s stock and insert a void_reversal inventory transaction.

4.  Phase 2: release the sale’s serial numbers so they can be sold again.

5.  Insert the audit entry. Commit.

#### 3.12.3 Commit an import

1.  Load the import (status previewed, not expired). Begin a transaction.

2.  Create new categories named in the file.

3.  For each valid new row insert the product and, when opening_stock is above 0, an opening inventory transaction.

4.  For each valid update row update name, category, unit, prices and reorder level (and warranty months, status). Do not touch stock.

5.  Re-check SKU uniqueness (SRS-IMP-07). Apply the mode rules.

6.  Write the audit entry and update the import log (status committed, counts, time); clear the payload. Commit.

### 3.13 Suppliers (Should)

| **ID**     | **Requirement**                                                                                                                                                                                                                                                    | **Priority** | **Traces to** |
|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|---------------|
| SRS-SUP-01 | An Admin shall create and update suppliers (name required, up to 150 characters, unique ignoring case; contact person, phone, email, notes optional) and deactivate them. Staff shall have view-only access. A supplier with open claims shall not be deactivated. | Should       | FR-020        |

### 3.14 Warranty and Claims (Should)

| **ID**     | **Requirement**                                                                                                                                                                                                                                                                             | **Priority** | **Traces to**  |
|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|----------------|
| SRS-WAR-01 | When a sale completes, a warranty record shall be created for each sale item whose product has warranty_months above 0: one per serial number if the product is serial-tracked, otherwise one per sale item.                                                                                | Should       | FR-021, BR-17  |
| SRS-WAR-02 | The warranty start date shall be the sale date in the store time zone and the expiry date shall be start date plus warranty months (calendar months; if the day does not exist in the target month, the last day of that month).                                                            | Should       | FR-021, BR-14  |
| SRS-WAR-03 | Warranty validity shall be calculated: Active when today is on or before the expiry date, otherwise Expired.                                                                                                                                                                                | Should       | FR-021         |
| SRS-WAR-04 | Warranties shall be searchable by sale number, customer phone, product SKU or name, and serial number.                                                                                                                                                                                      | Should       | FR-021         |
| SRS-WAR-05 | An Admin shall create a manual warranty (product, customer, purchase date, warranty months defaulting to the product’s) for goods with no sale record. It shall have source manual and be audited.                                                                                          | Should       | D-12           |
| SRS-WAR-06 | Admin or Staff shall attach a customer to a warranty that has none. Sales shall remain unchanged.                                                                                                                                                                                           | Should       | D-12, BR-07    |
| SRS-CLM-01 | Creating a claim shall require a warranty, a customer with a phone number, a problem description (1 to 1,000 characters) and a claim date (default today). The status shall start as Submitted and the claim number shall come from a sequence (C- followed by 6 digits).                   | Should       | FR-022, BR-07  |
| SRS-CLM-02 | If the warranty is Expired on the claim date, Staff shall be blocked (OUT_OF_WARRANTY); an Admin may continue with a mandatory note. A warranty from a voided sale shall be blocked for everyone.                                                                                           | Should       | BR-14          |
| SRS-CLM-03 | Status changes shall go through one transition endpoint that enforces the allowed transitions in PRD §7.2. An invalid transition shall be rejected with INVALID_TRANSITION.                                                                                                                 | Should       | FR-022         |
| SRS-CLM-04 | Required data per transition: With Supplier needs supplier, sent date and expected return date; Returned needs actual return date and resolution; Ready for Customer from Submitted needs a resolution; Completed needs collection date; Rejected and Cancelled (Admin only) need a reason. | Should       | BR-16, FR-023  |
| SRS-CLM-05 | Date rules: expected return date is on or after sent date; actual return date is on or after sent date; collection date is on or after the actual return date (or the claim date for in-store resolution); sent, actual return and collection dates shall not be in the future.             | Should       | FR-023         |
| SRS-CLM-06 | Every status change shall write a claim_status_history row and an audit entry in the same transaction.                                                                                                                                                                                      | Should       | FR-022, BR-12  |
| SRS-CLM-07 | Overdue shall be calculated at query time, never stored. Days away is today minus sent date; days overdue is today minus expected return date.                                                                                                                                              | Should       | BR-15          |
| SRS-CLM-08 | Claims in a final status (Completed, Rejected, Cancelled) shall be read-only.                                                                                                                                                                                                               | Should       | FR-022         |
| SRS-CLM-09 | The claim list shall filter by status, supplier, overdue only, customer phone and date range.                                                                                                                                                                                               | Should       | FR-022, FR-028 |
| SRS-SER-01 | For a serial-tracked product the sale line shall carry exactly as many serial numbers as its quantity (1 to 100 characters each). A serial shall be unique within the line and unique per product among serials not released by a void.                                                     | Should       | FR-027         |
| SRS-SER-02 | A claim shall show the serial number of its warranty record where one exists.                                                                                                                                                                                                               | Should       | FR-027         |

### 3.15 Low-Stock Alert and Advanced Filtering (Should)

| **ID**     | **Requirement**                                                                                                                                                                                                                                                                                                                      | **Priority** | **Traces to** |
|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|---------------|
| SRS-LOW-01 | A product shall be low stock when it is active and stock_qty is at or below its reorder_level. The product list, inventory list, POS result and dashboard shall indicate it, and lists shall offer a low-stock filter.                                                                                                               | Should       | FR-026, BR-19 |
| SRS-FLT-01 | Product, sales and claim lists shall support combined filters (AND): products by category, status, stock range, price range and low stock; sales by date range, user, customer, payment method, status and amount range; claims by status, supplier, overdue and date range. An Admin export of a list shall apply the same filters. | Should       | FR-028        |

## 4. External Interface Requirements

### 4.1 User Interface

| **ID**    | **Requirement**                                                                                                                                                                                                                                                                                     | **Priority** | **Traces to** |
|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|---------------|
| SRS-UI-01 | The interface shall be built strictly using Vuetify 3 component primitives (v-container, v-row, v-col, v-card, v-data-table, etc.) for all layouts, grids, and UI elements. Raw HTML tables (<table>, <tr>, <td>) and custom scoped CSS for layout purposes are strictly banned. The UI shall be verified at 360, 768 and 1280 px width. Under 600 px, data tables shall adapt into mobile-friendly views and the POS cart into a bottom sheet / drawer. | Must         | NFR-04        |
| SRS-UI-02 | Touch targets shall be at least 44 × 44 px, text contrast at least 4.5:1, every form field labelled, and desktop screens operable by keyboard.                                                                                                                                                      | Must         | NFR-01        |
| SRS-UI-03 | Validation errors shall appear next to the field as text, not by colour alone.                                                                                                                                                                                                                      | Must         | NFR-01        |
| SRS-UI-04 | Void, deactivate, import commit and claim reject/cancel shall ask for confirmation.                                                                                                                                                                                                                 | Must         | PRD §8        |
| SRS-UI-05 | Every screen shall show loading and error states. Submit buttons shall be disabled while a request is in progress.                                                                                                                                                                                  | Must         | NFR-09        |
| SRS-UI-06 | Unauthenticated users shall be redirected to login and returned to the requested page afterwards. Menu items not allowed for the role shall be hidden (a convenience only; SRS-AUTH-08 is the control). An expired session shall return the user to login without losing a POS cart held in memory. | Must         | FR-001        |
| SRS-UI-07 | Dates shall display in the store time zone (configured via infrastructure `TZ` environment variable) and money using the configured currency and decimals.                                                                                                                                          | Must         | SRS-SET-01    |

Screens: Login; Dashboard; POS; Products; Categories; Inventory; Sales History; Customers; Import; Reports and Export; Users; Audit Log; Settings; Suppliers, Warranty and Claims (Phase 2). Screen behaviour is described in PRD §4 and §8.

### 4.2 API Interface

- REST over HTTPS, JSON bodies, base path /api/v1. Authenticated calls send the access token in the Authorization header (Bearer).

- Success responses use 200 or 201. Errors use one shape: { code, message, details }, with the codes in §8.

- List endpoints take page (default 1), pageSize (default 25, maximum 100), filters and sort; they return items plus page, pageSize and total.

- Dates use ISO 8601. Sales history accepts `from_date` and `to_date` in YYYY-MM-DD format; these boundaries use the configured store time zone (managed via `TZ` env var). Money is sent and returned as strings with two decimals to avoid floating point errors.

- Rate limits: login 10 requests per minute per IP; other endpoints 300 per minute per IP.

| **Endpoint**                                                                                                          | **Roles**                           | **Purpose**                                                | **Requirements**  |
|-----------------------------------------------------------------------------------------------------------------------|-------------------------------------|------------------------------------------------------------|-------------------|
| POST /auth/login, /auth/refresh, /auth/logout                                                                         | Public (refresh/logout need cookie) | Sign in, renew token, sign out.                            | SRS-AUTH-01 to 06 |
| POST /auth/change-password                                                                                            | Admin, Staff                        | Change own password.                                       | SRS-USR-05        |
| GET, POST /users; PATCH /users/:id; POST /users/:id/reset-password                                                    | Admin                               | Manage users.                                              | SRS-USR-01 to 04  |
| GET, POST /categories; PATCH /categories/:id                                                                          | GET: both. Write: Admin             | Manage categories.                                         | SRS-CAT-01, 02    |
| GET /products, /products/:id; POST /products; PATCH /products/:id                                                     | GET: both. Write: Admin             | Search, view, create and update products.                  | SRS-PRD-01 to 07  |
| GET /products/:id/movements; GET /inventory                                                                           | Admin, Staff                        | Movement history and stock list.                           | SRS-INV-05, 06    |
| POST /inventory/stock-in                                                                                              | Admin, Staff                        | Record stock-in.                                           | SRS-INV-03        |
| POST /inventory/adjustments                                                                                           | Admin                               | Adjust stock.                                              | SRS-INV-04        |
| GET, POST /customers; PATCH /customers/:id                                                                            | Admin, Staff                        | Manage customers.                                          | SRS-CUS-01 to 04  |
| POST /sales (Idempotency-Key header)                                                                                  | Admin, Staff                        | Complete a sale.                                           | SRS-SAL-01 to 09  |
| GET /sales, /sales/filter-users, /sales/:id                                                                           | Admin, Staff                        | Sales history and detail.                                  | SRS-SAL-11        |
| POST /sales/:id/void                                                                                                  | Admin                               | Void a sale.                                               | SRS-VOID-01 to 06 |
| POST /imports/preview (multipart); POST /imports/:id/commit; GET /imports, /imports/:id/errors.csv, /imports/template | Admin                               | Import with preview, commit, logs, error report, template. | SRS-IMP-01 to 10  |
| GET /exports/products, /exports/inventory, /exports/sales, /exports/reports/:name (format=xlsx or csv)                | Admin                               | Export data and reports.                                   | SRS-EXP-01 to 05  |
| GET /reports/dashboard, /reports/sales, /reports/inventory, /reports/warranty                                         | Admin, Staff (limited)              | Dashboard and reports.                                     | SRS-RPT-01 to 06  |
| GET /audit-logs                                                                                                       | Admin                               | View audit log.                                            | SRS-AUD-04        |
| GET, PATCH /settings                                                                                                  | GET: both. PATCH: Admin             | Currency settings (store time zone is managed via container TZ env var). | SRS-SET-01        |
| GET, POST /suppliers; PATCH /suppliers/:id                                                                            | GET: both. Write: Admin             | Manage suppliers (Should).                                 | SRS-SUP-01        |
| GET /warranties; POST /warranties (manual, Admin); PATCH /warranties/:id (attach customer)                            | GET, PATCH: both. POST: Admin       | Search and manage warranties (Should).                     | SRS-WAR-03 to 06  |
| GET, POST /claims; GET /claims/:id; POST /claims/:id/transition                                                       | Admin, Staff (reject/cancel: Admin) | Create, view and move claims (Should).                     | SRS-CLM-01 to 09  |

### 4.3 Software and Communication Interfaces

- PostgreSQL through node-postgres with parameterized queries only; schema changes through Knex migrations kept in Git.

- ExcelJS for .xlsx and .csv reading and writing, used only on the server.

- No third-party service is called at runtime. TLS is provided by the hosts. CORS allows only the frontend origin.

## 5. Data Requirements

Types: BIGINT keys are GENERATED ALWAYS AS IDENTITY. Money is NUMERIC(12,2). Timestamps are TIMESTAMPTZ (UTC). Every foreign key is enforced by the database. Statuses and types are VARCHAR with a CHECK listing the allowed values.

### 5.1 users

| **Column**                | **Type**     | **Constraints**                               |
|---------------------------|--------------|-----------------------------------------------|
| id                        | BIGINT       | Primary key.                                  |
| username                  | VARCHAR(50)  | NOT NULL. Unique ignoring case.               |
| password_hash             | TEXT         | NOT NULL.                                     |
| full_name                 | VARCHAR(100) | NOT NULL.                                     |
| role                      | VARCHAR(10)  | NOT NULL. admin or staff.                     |
| status                    | VARCHAR(10)  | NOT NULL, default active. active or inactive. |
| must_change_password      | BOOLEAN      | NOT NULL, default true.                       |
| failed_attempts           | INT          | NOT NULL, default 0.                          |
| locked_until              | TIMESTAMPTZ  | Nullable.                                     |
| last_login_at, created_at | TIMESTAMPTZ  | created_at NOT NULL default now().            |

### 5.2 refresh_tokens

| **Column**             | **Type**    | **Constraints**                 |
|------------------------|-------------|---------------------------------|
| id                     | BIGINT      | Primary key.                    |
| user_id                | BIGINT      | NOT NULL, foreign key to users. |
| token_hash             | TEXT        | NOT NULL, unique.               |
| expires_at             | TIMESTAMPTZ | NOT NULL.                       |
| revoked_at, created_at | TIMESTAMPTZ | revoked_at nullable.            |

### 5.3 categories

| **Column**  | **Type**     | **Constraints**                 |
|-------------|--------------|---------------------------------|
| id          | BIGINT       | Primary key.                    |
| name        | VARCHAR(100) | NOT NULL. Unique ignoring case. |
| description | VARCHAR(255) | Nullable.                       |
| status      | VARCHAR(10)  | NOT NULL, default active.       |

### 5.4 products

Unique partial index on lower(sku) where status = active. Trigram (GIN) index on name and sku for search.

| **Column**             | **Type**      | **Constraints**                               |
|------------------------|---------------|-----------------------------------------------|
| id                     | BIGINT        | Primary key.                                  |
| sku                    | VARCHAR(50)   | NOT NULL, trimmed.                            |
| name                   | VARCHAR(200)  | NOT NULL.                                     |
| category_id            | BIGINT        | NOT NULL, foreign key.                        |
| unit                   | VARCHAR(20)   | NOT NULL, default pcs.                        |
| cost_price             | NUMERIC(12,2) | NOT NULL, default 0, CHECK \>= 0.             |
| selling_price          | NUMERIC(12,2) | NOT NULL, CHECK \>= 0.                        |
| stock_qty              | INT           | NOT NULL, default 0, CHECK \>= 0.             |
| reorder_level          | INT           | NOT NULL, default 5, CHECK \>= 0.             |
| warranty_months        | INT           | NOT NULL, default 0, CHECK between 0 and 120. |
| tracks_serial          | BOOLEAN       | NOT NULL, default false.                      |
| status                 | VARCHAR(10)   | NOT NULL, default active.                     |
| created_at, updated_at | TIMESTAMPTZ   | NOT NULL, default now().                      |

### 5.5 customers

Index on phone and trigram index on name.

| **Column**             | **Type**     | **Constraints**                                   |
|------------------------|--------------|---------------------------------------------------|
| id                     | BIGINT       | Primary key.                                      |
| name                   | VARCHAR(100) | NOT NULL.                                         |
| phone                  | VARCHAR(30)  | Nullable. Not unique (duplicates give a warning). |
| created_at, updated_at | TIMESTAMPTZ  | NOT NULL, default now().                          |

### 5.6 sales

Index on sold_at. Sequence for sale numbers.

| **Column**                        | **Type**                          | **Constraints**                                                                                  |
|-----------------------------------|-----------------------------------|--------------------------------------------------------------------------------------------------|
| id                                | BIGINT                            | Primary key.                                                                                     |
| sale_no                           | VARCHAR(20)                       | NOT NULL, unique.                                                                                |
| idempotency_key                   | VARCHAR(64)                       | NOT NULL, unique.                                                                                |
| user_id                           | BIGINT                            | NOT NULL, foreign key to users.                                                                  |
| customer_id                       | BIGINT                            | Nullable, foreign key.                                                                           |
| sold_at                           | TIMESTAMPTZ                       | NOT NULL, default now().                                                                         |
| subtotal, discount_amount, total  | NUMERIC(12,2)                     | NOT NULL. discount_amount default 0, between 0 and subtotal; total = subtotal − discount_amount. |
| payment_method                    | VARCHAR(20)                       | NOT NULL. cash, card, bank_transfer, other.                                                      |
| status                            | VARCHAR(10)                       | NOT NULL, default completed. completed or voided.                                                |
| voided_by, voided_at, void_reason | BIGINT, TIMESTAMPTZ, VARCHAR(255) | All three required when status is voided; otherwise null (CHECK).                                |

### 5.7 sale_items

| **Column**                  | **Type**                  | **Constraints**                               |
|-----------------------------|---------------------------|-----------------------------------------------|
| id                          | BIGINT                    | Primary key.                                  |
| sale_id                     | BIGINT                    | NOT NULL, foreign key.                        |
| product_id                  | BIGINT                    | NOT NULL, foreign key.                        |
| sku_snapshot, name_snapshot | VARCHAR(50), VARCHAR(200) | NOT NULL.                                     |
| quantity                    | INT                       | NOT NULL, CHECK \> 0.                         |
| unit_price, line_total      | NUMERIC(12,2)             | NOT NULL. line_total = quantity × unit_price. |

### 5.8 sale_item_serials (Should)

Unique index on (product_id, serial_no) where released_at is null.

| **Column**               | **Type**     | **Constraints**              |
|--------------------------|--------------|------------------------------|
| id                       | BIGINT       | Primary key.                 |
| sale_item_id, product_id | BIGINT       | NOT NULL, foreign keys.      |
| serial_no                | VARCHAR(100) | NOT NULL.                    |
| released_at              | TIMESTAMPTZ  | Set when the sale is voided. |

### 5.9 inventory_transactions

Append-only. Index on (product_id, created_at).

| **Column**                   | **Type**            | **Constraints**                                               |
|------------------------------|---------------------|---------------------------------------------------------------|
| id                           | BIGINT              | Primary key.                                                  |
| product_id                   | BIGINT              | NOT NULL, foreign key.                                        |
| type                         | VARCHAR(15)         | NOT NULL. opening, stock_in, adjustment, sale, void_reversal. |
| quantity_change              | INT                 | NOT NULL, CHECK \<\> 0.                                       |
| balance_after                | INT                 | NOT NULL, CHECK \>= 0.                                        |
| reason                       | VARCHAR(255)        | Required when type is adjustment.                             |
| reference_type, reference_id | VARCHAR(20), BIGINT | Nullable. Points to the sale or import.                       |
| user_id, created_at          | BIGINT, TIMESTAMPTZ | NOT NULL.                                                     |

### 5.10 import_logs

| **Column**                           | **Type**                 | **Constraints**                                                 |
|--------------------------------------|--------------------------|-----------------------------------------------------------------|
| id                                   | BIGINT                   | Primary key.                                                    |
| user_id                              | BIGINT                   | NOT NULL, foreign key.                                          |
| filename, file_type                  | VARCHAR(255), VARCHAR(5) | NOT NULL. file_type xlsx or csv.                                |
| rows_total, rows_valid, rows_error   | INT                      | NOT NULL.                                                       |
| status                               | VARCHAR(12)              | NOT NULL. previewed, committed, cancelled, expired, failed.     |
| payload                              | JSONB                    | Validated rows while previewed; cleared after commit or expiry. |
| expires_at, created_at, committed_at | TIMESTAMPTZ              | expires_at = created_at + 60 minutes.                           |

### 5.11 audit_logs

Append-only. Index on (created_at), (user_id), (action).

| **Column**             | **Type**            | **Constraints**                                      |
|------------------------|---------------------|------------------------------------------------------|
| id                     | BIGINT              | Primary key.                                         |
| user_id                | BIGINT              | Nullable (for example a lockout of an unknown user). |
| action                 | VARCHAR(50)         | NOT NULL. Action code.                               |
| entity_type, entity_id | VARCHAR(30), BIGINT | Nullable.                                            |
| details                | JSONB               | No passwords or tokens.                              |
| created_at             | TIMESTAMPTZ         | NOT NULL, default now().                             |

### 5.12 settings

| **Column** | **Type**    | **Constraints**                                                                                                                                           |
|------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| key        | VARCHAR(50) | Primary key. `currency_code`, `currency_decimals`. (Note: store time zone GMT+7 is handled at the infrastructure level via container `TZ` env variable). |
| value      | JSONB       | NOT NULL.                                                                                                                                                 |

### 5.13 suppliers (Should)

| **Column**                          | **Type**      | **Constraints**                 |
|-------------------------------------|---------------|---------------------------------|
| id                                  | BIGINT        | Primary key.                    |
| name                                | VARCHAR(150)  | NOT NULL. Unique ignoring case. |
| contact_person, phone, email, notes | VARCHAR, TEXT | Nullable.                       |
| status                              | VARCHAR(10)   | NOT NULL, default active.       |

### 5.14 warranties (Should)

Index on (customer_id), (product_id), (expiry_date).

| **Column**              | **Type**     | **Constraints**                                     |
|-------------------------|--------------|-----------------------------------------------------|
| id                      | BIGINT       | Primary key.                                        |
| sale_item_id            | BIGINT       | Nullable (null for manual warranties), foreign key. |
| product_id              | BIGINT       | NOT NULL, foreign key.                              |
| customer_id             | BIGINT       | Nullable until a customer is attached.              |
| serial_no               | VARCHAR(100) | Nullable.                                           |
| start_date, expiry_date | DATE         | NOT NULL. expiry_date \>= start_date.               |
| source                  | VARCHAR(10)  | NOT NULL. sale or manual.                           |
| created_at              | TIMESTAMPTZ  | NOT NULL, default now().                            |

### 5.15 warranty_claims (Should)

Index on (status, expected_return_date). Sequence for claim numbers.

| **Column**                                                          | **Type**            | **Constraints**                                     |
|---------------------------------------------------------------------|---------------------|-----------------------------------------------------|
| id                                                                  | BIGINT              | Primary key.                                        |
| claim_no                                                            | VARCHAR(20)         | NOT NULL, unique.                                   |
| warranty_id, customer_id                                            | BIGINT              | NOT NULL, foreign keys.                             |
| claim_date                                                          | DATE                | NOT NULL.                                           |
| problem                                                             | VARCHAR(1000)       | NOT NULL.                                           |
| status                                                              | VARCHAR(20)         | NOT NULL. The seven statuses.                       |
| supplier_id                                                         | BIGINT              | Nullable, foreign key.                              |
| sent_date, expected_return_date, actual_return_date, collected_date | DATE                | Nullable. Date rules in SRS-CLM-05.                 |
| resolution                                                          | VARCHAR(15)         | Nullable. repaired, replaced, cannot_repair, other. |
| out_of_warranty_note, notes                                         | TEXT                | Nullable.                                           |
| created_by, created_at, updated_at                                  | BIGINT, TIMESTAMPTZ | NOT NULL.                                           |

### 5.16 claim_status_history (Should)

| **Column**                | **Type**                          | **Constraints**                     |
|---------------------------|-----------------------------------|-------------------------------------|
| id                        | BIGINT                            | Primary key.                        |
| claim_id                  | BIGINT                            | NOT NULL, foreign key.              |
| from_status, to_status    | VARCHAR(20)                       | from_status null for the first row. |
| user_id, note, created_at | BIGINT, VARCHAR(255), TIMESTAMPTZ | user_id and created_at NOT NULL.    |

### 5.17 Retention, Seed Data and Migrations

- Business records (sales, inventory transactions, audit log, claims) are kept for the life of the system; none are deleted by the application.

- Refresh tokens are purged 7 days after expiry. Import payloads are cleared after commit or expiry.

- Seed data: the first Admin (from environment variables), default settings and no sample business data in production.

- Every schema change is a versioned migration; the database is rebuildable from migrations alone.

## 6. Non-Functional Requirements and Verification

| **ID**                     | **Specification**                                                                                                                                         | **Verified by**                                                           |
|----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| **NFR-01 Usability**       | At least 90% of UAT staff complete a sale without help; SUS score 68 or higher.                                                                           | UAT, SUS questionnaire                                                    |
| **NFR-02 Performance**     | At 10,000 products and 5 concurrent users: product search within 1 s and sale completion within 2 s (95th percentile); page load within 3 s on broadband. | Load test on staging (for example k6) with seeded data                    |
| **NFR-03 Import limits**   | 5,000 rows and 5 MB maximum; validation report within 30 s for 5,000 rows.                                                                                | Test with 5,000-row and oversized files                                   |
| **NFR-04 Responsive**      | Layouts correct at 360, 768 and 1280 px on the browsers in §2.4.                                                                                          | Playwright viewport tests plus manual device check                        |
| **NFR-05 Authentication**  | HTTPS only; hashed passwords; lock after 5 failed attempts for 15 minutes; access token 15 minutes; refresh up to 8 hours.                                | Automated API tests; configuration inspection                             |
| **NFR-06 Authorization**   | Every endpoint enforces role on the server.                                                                                                               | Automated test calling every endpoint as Staff and as no user             |
| **NFR-07 Input and files** | Parameterized queries, server-side validation, upload type and size checks, export formula neutralization.                                                | Code review; tests with malicious file names, formulas and SQL-like input |
| **NFR-08 Data integrity**  | Sale, items, stock, inventory transaction and audit in one transaction; database constraints; invariant in SRS-INV-02.                                    | Concurrent-sale test; rollback test; invariant query after test runs      |
| **NFR-09 Reliability**     | A failed operation returns a clear error and writes nothing; duplicate submit creates one sale.                                                           | Fault-injection test; repeated Idempotency-Key test                       |
| **NFR-10 Backup**          | Daily backup, 7-day retention, restore tested before UAT; recovery point 24 h, recovery time 1 working day.                                               | Restore drill with timing, recorded                                       |
| **NFR-11 Privacy**         | Customer name and phone are not written to application logs or audit details.                                                                             | Log inspection after test run                                             |
| **NFR-12 Auditability**    | Append-only audit log with user, UTC time, action, record, details.                                                                                       | Attempt UPDATE/DELETE as the API database role (must fail)                |
| **NFR-13 Maintainability** | Linting, formatting and automated tests for BR-01 to BR-19 in CI.                                                                                         | CI pipeline result                                                        |
| **NFR-14 Compatibility**   | XLSX opens in Excel and LibreOffice; CSV is UTF-8 with BOM and shows accented characters correctly.                                                       | Manual open test with accented sample data                                |

## 7. State Models

### 7.1 Sale

| **From**      | **To**    | **Trigger and rules**                                                                      |
|---------------|-----------|--------------------------------------------------------------------------------------------|
| **(none)**    | completed | Successful sale transaction (§3.12.1).                                                     |
| **completed** | voided    | Admin void with reason; not allowed if already voided or (Phase 2) it has an active claim. |
| **voided**    | —         | Final.                                                                                     |

### 7.2 Import

| **From**      | **To**    | **Trigger and rules**                                                                 |
|---------------|-----------|---------------------------------------------------------------------------------------|
| **(none)**    | previewed | File validated; payload stored; expires after 60 minutes.                             |
| **previewed** | committed | Admin commit succeeds (all or valid_only).                                            |
| **previewed** | cancelled | Admin discards the preview.                                                           |
| **previewed** | expired   | Expiry time passes; payload cleared.                                                  |
| **previewed** | failed    | Commit transaction fails and rolls back; the import can be retried while not expired. |

### 7.3 Warranty Claim (Should)

| **Status**             | **Meaning**                                                                                            |
|------------------------|--------------------------------------------------------------------------------------------------------|
| **Submitted**          | Claim recorded; not yet sent anywhere. Initial status.                                                 |
| **With Supplier**      | Product sent to a supplier or service provider. Requires supplier, sent date and expected return date. |
| **Returned**           | Product received back from the supplier. Requires actual return date and a resolution.                 |
| **Ready for Customer** | Product (or replacement) is in store and the customer can collect it.                                  |
| **Completed**          | Customer collected the product. Requires collection date. Final.                                       |
| **Rejected**           | Claim declined, for example out of warranty or customer damage. Admin only; reason required. Final.    |
| **Cancelled**          | Claim withdrawn or created in error. Admin only; reason required. Final.                               |

| **From**                           | **Allowed next status**                                                                    |
|------------------------------------|--------------------------------------------------------------------------------------------|
| **Submitted**                      | With Supplier; Ready for Customer (resolved in store); Rejected (Admin); Cancelled (Admin) |
| **With Supplier**                  | Returned; Cancelled (Admin)                                                                |
| **Returned**                       | Ready for Customer                                                                         |
| **Ready for Customer**             | Completed                                                                                  |
| **Completed, Rejected, Cancelled** | None (final)                                                                               |

## 8. Error Catalogue

| **Code**                     | **HTTP** | **When**                                                                                   |
|------------------------------|----------|--------------------------------------------------------------------------------------------|
| **VALIDATION_FAILED**        | 422      | A field is missing, the wrong type or out of range. Details list each field.               |
| **AUTH_INVALID_CREDENTIALS** | 401      | Wrong username or password, or an invalid or expired token.                                |
| **AUTH_LOCKED**              | 423      | Account locked after 5 failed attempts.                                                    |
| **AUTH_FORBIDDEN**           | 403      | The role is not allowed to call the endpoint.                                              |
| **NOT_FOUND**                | 404      | The record does not exist.                                                                 |
| **SKU_DUPLICATE**            | 409      | The SKU is already used by an active product.                                              |
| **PRODUCT_INACTIVE**         | 409      | A sale or stock-in used an inactive product.                                               |
| **INSUFFICIENT_STOCK**       | 409      | A sale quantity is above available stock. Details name the product and available quantity. |
| **NEGATIVE_STOCK**           | 409      | An adjustment would make stock negative.                                                   |
| **SALE_ALREADY_VOIDED**      | 409      | The sale is already voided.                                                                |
| **SALE_HAS_CLAIMS**          | 409      | The sale has an active claim and cannot be voided.                                         |
| **INVALID_TRANSITION**       | 409      | The claim status change is not allowed or required data is missing.                        |
| **OUT_OF_WARRANTY**          | 409      | Staff tried to create a claim on an expired warranty.                                      |
| **IMPORT_FILE_TYPE**         | 415      | The file is not .xlsx or .csv.                                                             |
| **IMPORT_LIMIT_EXCEEDED**    | 413      | More than 5 MB or 5,000 rows.                                                              |
| **IMPORT_HAS_ERRORS**        | 409      | Commit in mode all while error rows exist.                                                 |
| **IMPORT_ALREADY_COMMITTED** | 409      | The import was already committed or cancelled.                                             |
| **IMPORT_EXPIRED**           | 410      | The preview expired; upload the file again.                                                |
| **EXPORT_TOO_LARGE**         | 413      | More than 50,000 rows requested.                                                           |
| **RATE_LIMITED**             | 429      | Too many requests.                                                                         |
| **INTERNAL_ERROR**           | 500      | Unexpected failure. Nothing is saved; details are logged without personal data.            |

## 9. Verification and Traceability

### 9.1 Verification Approach

- **Unit tests:** every business rule BR-01 to BR-19 and validation function (SKU, discount, transitions, warranty dates, overdue).

- **API integration tests (Supertest) against a real PostgreSQL test database:** every endpoint for success, validation errors and role errors; sale, void and import transactions; concurrent sale of the last unit; rollback on failure; Idempotency-Key replay.

- **End-to-end tests (Playwright):** login, sale at 360 px width, import with preview, void, claim lifecycle.

- **Non-functional tests:** load test, backup restore drill, DB-role check for append-only tables, log inspection.

- **UAT:** per BRD §12 with at least 1 Admin and 2 Staff users, at least 500 products, and the pass criteria stated there.

### 9.2 Traceability Matrix

| **BRD requirement**           | **SRS requirements**                           | **Main verification**                                      |
|-------------------------------|------------------------------------------------|------------------------------------------------------------|
| FR-001 Authentication         | SRS-AUTH-01 to 06, 10, 11                      | API tests, E2E                                             |
| FR-002 Roles                  | SRS-AUTH-07 to 09                              | Role test on every endpoint                                |
| FR-003 Products               | SRS-PRD-01 to 05                               | API tests                                                  |
| FR-004 Categories             | SRS-CAT-01, 02                                 | API tests                                                  |
| FR-005 Product fields         | SRS-PRD-01, 03; data dictionary §5             | API tests, schema inspection                               |
| FR-006 Inventory              | SRS-INV-01, 02, 05, 06                         | API tests, invariant query                                 |
| FR-007 Stock-in               | SRS-INV-03                                     | API tests                                                  |
| FR-008 Adjustment             | SRS-INV-04                                     | API tests                                                  |
| FR-009 POS                    | SRS-SAL-01, 10; SRS-PRD-07                     | API tests, E2E at 360 px                                   |
| FR-010 Sales                  | SRS-SAL-01 to 09, 12                           | API tests                                                  |
| FR-011 Stock deduction        | SRS-SAL-04, 08; §3.12.1                        | Concurrent-sale and rollback tests                         |
| FR-012 Sales history          | SRS-SAL-11                                     | API tests                                                  |
| FR-013 Customers              | SRS-CUS-01 to 04                               | API tests                                                  |
| FR-014 Reports                | SRS-RPT-01 to 06                               | API tests with known data; screen versus export comparison |
| FR-015 Search/filter          | SRS-PRD-06, SRS-CUS-02, SRS-SAL-11, SRS-INV-05 | API tests                                                  |
| FR-016 Import                 | SRS-IMP-01, 02, 09                             | API tests with sample files                                |
| FR-017 Validation and preview | SRS-IMP-03 to 08, 10; §3.12.3                  | Valid, invalid and conflict file tests                     |
| FR-018 Export                 | SRS-EXP-01 to 05                               | API tests, manual open test                                |
| FR-019 Audit                  | SRS-AUD-01 to 05                               | API tests, DB-role test                                    |
| FR-020 Supplier               | SRS-SUP-01                                     | API tests                                                  |
| FR-021 Warranty               | SRS-WAR-01 to 06                               | Unit tests on dates, API tests                             |
| FR-022 Warranty claim         | SRS-CLM-01 to 03, 06, 08, 09                   | Transition tests, E2E                                      |
| FR-023 Return tracking        | SRS-CLM-04, 05, 07                             | Date and overdue unit tests                                |
| FR-024 User management        | SRS-USR-01 to 05                               | API tests                                                  |
| FR-025 Sale void              | SRS-VOID-01 to 06; §3.12.2                     | API tests, invariant query                                 |
| FR-026 Low-stock alert        | SRS-LOW-01                                     | API and UI tests                                           |
| FR-027 Serial numbers         | SRS-SER-01, 02                                 | API tests                                                  |
| FR-028 Advanced filtering     | SRS-FLT-01, SRS-CLM-09                         | API tests                                                  |
| Store settings (O-01, O-02)   | SRS-SET-01                                     | API tests, report date-boundary test                       |

## Appendix A. Items Added by This SRS

Writing detailed requirements exposed gaps in the BRD/PRD v3.1. These items were added here as proposed defaults. Please confirm them, then copy them into the BRD and PRD so the three documents agree.

| **\#**   | **Addition**                                                                                                                                                         | **Why it was needed**                                                                     |
|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| **A-01** | Store settings (currency, decimals) as a Must feature, SRS-SET-01; store time zone handled at infrastructure level via container TZ env var. | BR-18, O-01 and O-02 depend on them; reports and overdue checks need a defined time zone. |
| **A-02** | refresh_tokens table, must_change_password, per-request role check, and password policy (SRS-AUTH-02, 05, 07, 10; USR-01).                                           | Needed to implement the chosen JWT design safely and to apply role changes at once.       |
| **A-03** | import_logs gains payload, expires_at and statuses; preview expires after 60 minutes.                                                                                | Preview and commit are separate requests and files are not kept on disk.                  |
| **A-04** | Prices are never sent by the client; server uses current selling_price. Maximum 100 lines per sale. Idempotency-Key required.                                        | Enforces BR-08 and prevents double sales.                                                 |
| **A-05** | Sale with a non-cancelled claim cannot be voided; warranties of a voided sale cannot be claimed; serials are released on void (SRS-VOID-05, SRS-SER-01).             | Prevents claims against sales that no longer exist as completed sales.                    |
| **A-06** | Warranty records are per serial number for serial-tracked products, otherwise per sale item; customer is attached to the warranty, not to the sale (SRS-WAR-01, 06). | Keeps sales immutable (SRS-SAL-12) while satisfying D-12.                                 |
| **A-07** | Export limit of 50,000 rows; CSV exports prefix dangerous text with a single quote (SRS-EXP-02, 04).                                                                 | Protects the free-tier server memory and users’ spreadsheets.                             |
| **A-08** | Products and customers are deactivated or kept, never deleted, in v1 (SRS-PRD-05, SRS-CUS-04).                                                                       | Clarifies FR-003 and preserves history.                                                   |
| **A-09** | Database role for the API has no UPDATE or DELETE on audit_logs and inventory_transactions (SRS-AUD-03).                                                             | Makes “append-only” enforceable rather than a convention.                                 |
| **A-10** | Rate limits: login 10 per minute and other endpoints 300 per minute per IP.                                                                                          | Basic protection of the login endpoint.                                                   |

## Appendix B. Open Items
 
- **O-01:** Currency and decimals (default USD, 2 decimals, configured via `/settings`).
- **O-02 (Closed):** Store time zone is permanently resolved to GMT+7 (`Asia/Ho_Chi_Minh` / Vietnam) managed at the infrastructure level via the Node.js Docker container's `TZ` environment variable (dynamic database-driven timezone settings removed).
- **O-03:** Real Excel samples to finalize column mappings.
- **O-04:** Hosting plan for UAT and demo.
- **O-05:** Managed PostgreSQL provider and backup plan.
- **O-06:** UAT participants and sample dataset size.
- **O-07:** Whether Staff may record stock-in (enabled per SRS-INV-03).
- **Test Data Policy:** All seed data and UAT scenarios strictly use authentic Vietnamese PC hardware store items (Intel, MSI, Corsair, WD, Kingston, authentic Vietnamese names/phones), banning Faker.js and random string hashes.
