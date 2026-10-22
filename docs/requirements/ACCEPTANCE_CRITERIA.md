# Acceptance Criteria

Each criterion uses Given / When / Then. **AC-nnn** belongs to **US-nnn**. Where a story needs more than one check, extra lines use a letter (AC-017a).

> [!IMPORTANT]
> **Strict Test Data Rule ("No Fake Data")**:
> All test cases, verification fixtures, and UAT demonstrations must use authentic PC hardware catalog items (e.g., Intel Core i5-14400F, MSI B760M Motherboard, MSI RX 6800 XT GPU, Corsair Vengeance RAM, WD Black SN850X SSD), authentic Vietnamese user/customer names (e.g., Nguyen Van A, Bui Ngoc Lan), and valid Vietnamese 10-digit phone numbers. The use of Faker.js, randomized string hashes (e.g., `Product_1792...`), or generic placeholders ("Test Product", "Customer One") is strictly forbidden.

Test data baseline: authentic hardware item "Intel Core i5-14400F" (SKU "CPU-INTEL-14400F", stock 10, selling price 5,200,000 VND).

## A — Authentication and users

- **AC-001** Given an active user, when they sign in with the correct credentials, then they get an access token (15 min) and a refresh cookie (8 h), and see the dashboard.
- **AC-001a** Given a wrong username or wrong password, when they sign in, then the same generic error is shown for both.
- **AC-002** Given a signed-in user, when they sign out, then the refresh token is revoked and protected pages redirect to login. When the session expires, the user returns to login.
- **AC-003** Given 5 failed logins, when the user tries again within 15 minutes with the correct password, then login fails with AUTH_LOCKED. After 15 minutes login works and the counter resets.
- **AC-004** Given an Admin, when they create a user, then the user must change the password at first login. Deactivating a user blocks their next request. The last active Admin cannot be deactivated or demoted. Exactly two roles exist in the system (Admin and Staff).
- **AC-005** Given a signed-in user, when they supply the correct current password and a valid new one (8–128 characters), then the password changes and other sessions are revoked.
- **AC-006** Given a Staff user, when they call any Admin-only endpoint, then the API returns 403 AUTH_FORBIDDEN and changes nothing. Staff responses contain no cost price or margin data.

## B — Catalogue

- **AC-007** Given an Admin, when they create a category with a name that already exists (any letter case), then it is rejected. A category with active products cannot be deactivated.
- **AC-008** Given an Admin, when they create a product with SKU, name, category and selling price, then it is saved with defaults (unit pcs, cost 0, reorder level 5, active). Stock cannot be edited through product update.
- **AC-009** Given an active product with SKU "ABC-1", when an Admin creates another active product with SKU " abc-1 ", then it is rejected with SKU_DUPLICATE.
- **AC-010** Given a product with sales history, when an Admin deactivates it, then it disappears from POS search but stays in history and reports. Reactivation fails if another active product uses the SKU.
- **AC-011** Given 10,000 products, when a user searches "lamp" or a partial SKU, then matching products return within 1 s (95th percentile), with exact SKU first.

## C — Inventory

- **AC-012** Given a product with movements, when a user opens its history, then each row shows type, signed change, balance after, user, time and reason, newest first.
- **AC-013** Given P1 with stock 10, when stock-in of 5 is recorded, then stock is 15 and one stock_in ledger row exists. Quantity 0 or negative is rejected.
- **AC-014** Given P1 with stock 15, when an Admin adjusts to 12 with a reason, then stock is 12 and an adjustment row (−3) exists. A missing reason is rejected.
- **AC-015** Given P1 with stock 3, when an adjustment would give −1, then it is rejected with NEGATIVE_STOCK and stock stays 3.
- **AC-015a** For every product, stock equals the sum of its ledger changes (invariant query returns no rows).

## D — POS and sales

- **AC-016** Given P1 in stock, when Staff search and add 3 units, then the cart shows subtotal 300.00. The cart and UI are built strictly with Vuetify 3 components (no raw HTML tables) and work responsively at 360 px width.
- **AC-017** Given P1 with stock 10, when a sale of 11 is submitted, then it is rejected with INSUFFICIENT_STOCK (naming P1 and 10 available) and nothing is saved.
- **AC-017a** Given P1 with stock 1 and two simultaneous sales of 1, then exactly one succeeds and stock ends at 0.
- **AC-018** Given a sale, when the discount is above the subtotal or negative, then it is rejected. Total equals subtotal minus discount. Payment method must be cash, card, bank_transfer or other.
- **AC-019** Given a customer phone that exists, when Staff search by phone, then the customer is found. A new customer needs a name; a duplicate phone gives a warning, not a block.
- **AC-020** Given P1 with stock 10, when Staff sell 3, then stock is 7, one sale row, one sale item with SKU/name/price snapshot, one sale ledger row (−3) and one audit entry exist, all in one transaction. The price used is the server’s current selling price.
- **AC-020a** Given a failure during the transaction, then no part of the sale is saved.
- **AC-021** Given a sale request sent twice with the same Idempotency-Key, then only one sale exists and both responses show it.
- **AC-022** Given many sales, when a user filters by date range, user, customer, payment method or status, then only matching sales appear, paginated. Staff see no cost data.
- **AC-023** Given a completed sale of 3 × P1, when an Admin voids it with a reason, then the sale is marked voided, stock is restored (+3 void_reversal row), it leaves all totals, and a second void fails with SALE_ALREADY_VOIDED. Staff cannot void.

## E — Customers

- **AC-024** Given customers, when a user searches by partial name or phone, then matches appear. Customers cannot be deleted.

## F — Import and export

- **AC-025** Given an Admin, when they download the template, then it has the columns in PRD §9.1 and one example row, in .xlsx and .csv.
- **AC-026** Given a valid 500-row file, when uploaded, then the preview shows the right new/update counts and saves nothing. Given a file with 10 bad rows, then 10 errors are listed with row number, column and reason. Files over 5 MB or 5,000 rows, or other file types, are rejected.
- **AC-027** Given a preview with errors, when the Admin commits in mode all, then it is rejected (IMPORT_HAS_ERRORS). In mode valid_only only valid rows are saved in one transaction. A committed or expired preview cannot be committed again.
- **AC-028** Given a file row whose SKU matches an existing product with stock 10 and opening_stock 99, then name/prices are updated, stock stays 10 and the preview shows a notice.
- **AC-029** Given an Admin, when they export products, inventory, sales or a report, then the file opens in Excel and LibreOffice with correct accents, and a text cell starting with "=" is exported as text. More than 50,000 rows is refused. Staff cannot export.

## G — Reports, audit and settings

- **AC-030** Given sales today, then the dashboard displays a static operational snapshot of today’s total and count (voided excluded), trailing 7-day sales breakdown, and top 5 products. Stock value shows for Admin only. Dynamic date-range filtering is relegated to the Sales Report module.
- **AC-031** Given known test data, when an Admin opens the dedicated Sales Report (`/reports/sales`) and specifies a date range (From Date / To Date) and grouping dimension, then analytical sales totals match calculated figures, and exported figures equal screen figures.
- **AC-032** Given any audited action in BR-12, then an audit entry exists with user and UTC timestamp, and the API database role cannot update or delete audit rows.
- **AC-033** Given the application timezone configured at the infrastructure level via the Node.js container's `TZ` environment variable (e.g. `TZ=Asia/Ho_Chi_Minh`), then "today" boundaries, sales report date ranges, and overdue warranty checks evaluate according to that store time zone.

## H — Warranty and related (Phase 2)

- **AC-034** Given P1 with reorder level 5, when stock drops to 5 or below, then it is flagged in lists, POS and the dashboard count, and a low-stock filter works.
- **AC-035** Given a supplier with an open claim, then it cannot be deactivated. Staff can view but not edit suppliers.
- **AC-036** Given a 12-month product sold on a date, then expiry is the same day twelve months later (month-end clamped), shown Active until then and Expired after. A product with 0 months creates no warranty.
- **AC-037** Given a warranty, when Staff create a claim with customer name and phone and a problem, then the claim has status Submitted and a claim number. Without a customer phone it is rejected. Staff are blocked on an expired warranty; an Admin may continue with a note.
- **AC-038** Given a Submitted claim, when moved to With Supplier without supplier, sent date or expected return date, then it is rejected (INVALID_TRANSITION). With them, days away show, and after the expected date passes without a return date the claim shows Overdue.
- **AC-039** Given a With Supplier claim, when the return date and resolution are recorded, then it becomes Returned, then Ready for Customer, then Completed with a collection date. Each change adds a history row and an audit entry. Final claims are read-only.
- **AC-040** Given a claim, when an Admin rejects or cancels it with a reason, then it is final. Staff cannot reject or cancel.
- **AC-041** Given a serial-tracked product, then a sale line needs exactly as many serial numbers as quantity, unique per product; after a void the serials can be sold again.
- **AC-042** Given combined filters on products, sales or claims, then results satisfy all filters and an Admin export applies the same filters.
- **AC-043** Given an Admin, when they create a manual warranty (product, customer, purchase date), then it has source manual and can be claimed. A warranty from a voided sale cannot be claimed.

## Phase gates

| Gate | Pass condition |
|---|---|
| Phase 1 exit | AC-001 to AC-033 pass, including AC-017a and AC-020a |
| Phase 2 exit | AC-034 to AC-043 pass |
| UAT | 100% Must and at least 90% Should criteria pass; no open critical/high defects; SUS 68 or higher |
