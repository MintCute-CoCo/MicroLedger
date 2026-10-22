# User Stories

Format: **ID** As a *role*, I want *goal*, so that *benefit*. — Requirement · Priority.
Acceptance criteria for each story are in `ACCEPTANCE_CRITERIA.md` (same numbers: US-001 → AC-001).

## Epic A — Authentication and users

- **US-001** As a user, I want to sign in with my username and password, so that only authorised people can use the system. — FR-001 · Must
- **US-002** As a user, I want to sign out and have my session expire automatically, so that nobody can reuse my session on a shared device. — FR-001 · Must
- **US-003** As an Admin, I want an account to lock for 15 minutes after 5 failed logins, so that password guessing is slowed down. — FR-001 · Must
- **US-004** As an Admin, I want to create users, change roles, deactivate users and reset passwords, so that access follows staff changes. — FR-024 · Must
- **US-005** As a user, I want to change my own password, so that I can keep my account secure. — FR-024 · Must
- **US-006** As an Admin, I want roles enforced on the server, so that Staff cannot reach Admin functions even by calling the API directly. — FR-002 · Must

## Epic B — Catalogue

- **US-007** As an Admin, I want to create, rename and deactivate categories, so that products are organised. — FR-004 · Must
- **US-008** As an Admin, I want to create and update products with SKU, name, category, unit and prices, so that the catalogue is correct. — FR-003, FR-005 · Must
- **US-009** As an Admin, I want a duplicate SKU to be rejected, so that every active product has one unique code. — FR-005, BR-01 · Must
- **US-010** As an Admin, I want to deactivate a product instead of deleting it, so that sales and stock history stay intact. — FR-003 · Must
- **US-011** As a user, I want to search products by name or SKU, so that I find items quickly. — FR-015, FR-009 · Must

## Epic C — Inventory

- **US-012** As a user, I want to see a product’s current stock and its movement history, so that I understand why the quantity changed. — FR-006 · Must
- **US-013** As an Admin or Staff user, I want to record stock-in, so that received goods are counted. — FR-007 · Must
- **US-014** As an Admin, I want to adjust stock with a reason, so that counts can be corrected with a trace. — FR-008 · Must
- **US-015** As an Admin, I want the system to refuse any change that makes stock negative, so that quantities are always valid. — FR-008, BR-05 · Must

## Epic D — POS and sales

- **US-016** As Staff, I want to build a cart by searching products and setting quantities, so that I can serve a customer fast. — FR-009 · Must
- **US-017** As Staff, I want to be blocked when a quantity is above available stock, so that I never oversell. — FR-011 · Must
- **US-018** As Staff, I want to choose a payment method and an optional discount, so that the sale record is complete. — FR-010, BR-09, BR-10 · Must
- **US-019** As Staff, I want to attach a customer by phone or add a new one, so that customer details are available later. — FR-013 · Must
- **US-020** As Staff, I want to complete a sale in one step that deducts stock automatically, so that stock is always right. — FR-010, FR-011 · Must
- **US-021** As Staff, I want a double tap or a retry not to create two sales, so that totals are not inflated. — NFR-09 · Must
- **US-022** As a user, I want to view and filter sales history, so that I can look up a past sale. — FR-012 · Must
- **US-023** As an Admin, I want to void a sale with a reason, so that mistakes can be corrected and stock restored. — FR-025 · Must

## Epic E — Customers

- **US-024** As an Admin or Staff user, I want to create and search customers by name or phone, so that I can reuse customer details. — FR-013 · Must

## Epic F — Import and export

- **US-025** As an Admin, I want to download an import template, so that I know the required columns. — FR-016 · Must
- **US-026** As an Admin, I want to upload an Excel/CSV file and see a validation preview with row-level errors before anything is saved, so that bad data never enters the system. — FR-016, FR-017 · Must
- **US-027** As an Admin, I want to commit all rows or only the valid rows after reviewing the preview, so that I stay in control. — FR-017 · Must
- **US-028** As an Admin, I want an existing SKU in the file to update the product without changing its stock, so that imports cannot silently overwrite inventory. — BR-13 · Must
- **US-029** As an Admin, I want to export products, inventory, sales and reports to .xlsx or .csv, so that I can use the data in Excel. — FR-018 · Must

## Epic G — Reports, audit and settings

- **US-030** As an Admin, I want a dashboard with today’s sales, a 7-day trend and top products, so that I see the business at a glance. — FR-014 · Must
- **US-031** As an Admin, I want sales and inventory reports with filters, so that I can analyse performance. — FR-014 · Must
- **US-032** As an Admin, I want to view the audit log, so that I can see who did what and when. — FR-019 · Must
- **US-033** As an Admin, I want system settings (currency, decimals) configured and store time zone anchored via container environment (`TZ=Asia/Ho_Chi_Minh`), so that amounts and dates display consistently in the local store timezone. — SRS-SET-01 · Must

## Epic H — Low stock, suppliers and warranty (Phase 2)

- **US-034** As an Admin, I want products at or below their reorder level flagged, so that I reorder in time. — FR-026 · Should
- **US-035** As an Admin, I want to store supplier details, so that claims can name who has the product. — FR-020 · Should
- **US-036** As Staff, I want to look up a sale or product and see whether its warranty is Active or Expired, so that I can answer the customer at once. — FR-021 · Should
- **US-037** As Staff, I want to create a warranty claim for a customer, so that the case is recorded. — FR-022 · Should
- **US-038** As Staff, I want to send a claim to a supplier with sent and expected return dates and see days away and overdue, so that nothing is forgotten. — FR-023 · Should
- **US-039** As Staff, I want to record the return, mark the product ready, and record customer collection, so that the claim is closed properly. — FR-022, FR-023 · Should
- **US-040** As an Admin, I want to reject or cancel a claim with a reason, so that the outcome is traceable. — FR-022 · Should
- **US-041** As Staff, I want to enter serial numbers at sale for serial-tracked products, so that claims can identify the exact unit. — FR-027 · Should
- **US-042** As a user, I want to combine filters on products, sales and claims, so that I find records precisely. — FR-028 · Should
- **US-043** As an Admin, I want to create a manual warranty for goods with no sale record, so that migrated stock can still be claimed. — D-12 · Should
