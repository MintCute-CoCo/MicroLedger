# Scope

## 1. In scope

### Phase 1 — Must Have (Core)

- Authentication and user management
- Admin/Staff roles and permissions
- Product and category management
- Inventory quantity tracking with movement history
- Stock-in and stock adjustment (reason required)
- POS cart and sales with payment method and optional discount
- Automatic stock deduction in the same transaction as the sale
- Sales history and sale void (Admin)
- Basic customer information (name and phone)
- Excel/CSV import with validation and preview; Excel/CSV export
- Dashboard (static "Today / 7-Day" operational snapshot) and dedicated Sales Report (dynamic date-range filtering, dimensional aggregations, void transaction isolation)
- Search and filter
- Audit log
- Store settings (currency code, decimals; store time zone GMT+7 strictly managed at infrastructure level via container `TZ` environment variable)

### Phase 2 — Should Have

- Low-stock alert with configurable reorder level (default 5)
- Basic supplier information
- Serial number support
- Warranty information (per-product warranty period)
- Warranty claims and 7-status tracking
- Supplier/service-provider tracking, sent / expected / actual return dates, overdue calculation
- Customer collection / completion status
- Advanced (combined) filtering
- Warranty report

### Could Have (only if time remains)

Barcode scanning · supplier purchase orders · product images · partial returns and refunds · unit-price override with Admin approval · advanced warranty workflows · warranty expiry notifications · advanced analytics including profit & margin calculations and cost-price tracking in sales reports (current release tracks units sold, subtotal, discounts, and net revenue).

## 2. Out of scope

- Accounting and payroll
- Full ERP
- Bank/payment gateway integration
- Profit and margin reports (cost price is masked from sales reports; tracked only in inventory valuation for Admin)
- Tax calculation (selling prices are final prices in v1)
- E-commerce synchronization
- Multi-branch management and multi-currency
- Offline operation
- Complex repair-shop management
- AI forecasting

## 3. Assumptions and constraints

- One store, one currency, one branch.
- Store Time Zone: Fixed at GMT+7 (`Asia/Ho_Chi_Minh`), managed strictly at the infrastructure level via the Node.js Docker container's `TZ` environment variable. Dynamic database-driven timezone configuration is deliberately avoided.
- UI/UX Framework: The frontend relies exclusively on Vuetify 3 component primitives (`v-container`, `v-row`, `v-col`, `v-card`, `v-data-table` / `ResponsiveTable`, `v-btn`, `v-select`, etc.) for all layouts, grids, dialogs, and typography. Raw HTML tables (`<table>`, `<tr>`, `<td>`) and custom scoped CSS layout hacks are strictly prohibited.
- Test Data & Domain Realism: All database seeds and UAT scenarios strictly model a realistic Vietnamese PC hardware retail store (Intel, MSI, Corsair, WD, Kingston, authentic Vietnamese names and phone numbers). Random string hashes and Faker.js are banned.
- Up to 10,000 products, about 500 sales per day, up to 5 concurrent users.
- Existing Excel files are tabular and confirmed via verified PC hardware catalog templates (O-03 resolved).
- Low-cost containerized hosting; limits confirmed and verified in staging/CI.

## 4. Phase exit criteria

| Phase | Exit criteria |
|---|---|
| 1 — Core | All Must test cases pass; sale, void, stock-in, adjustment and import tested including a concurrent-sale test; backup restore tested |
| 2 — Warranty | A claim can be tracked from creation to supplier return to customer collection; all Should test cases pass |
| 3 — UAT | UAT pass criteria met; no open critical or high defects |

## 5. Scope change rule

Any new item must (1) be written as a requirement with an ID, (2) get a Must/Should/Could priority, (3) name what it replaces or delays, and (4) be recorded in `../management/STATUS.md` before work starts. Items not in Phase 1 never block the Phase 1 exit.
