# Problem Statement

## 1. Situation today

Target stores manage products, stock and sales in Excel files and notes. Warranty cases are handled informally.

## 2. Problems

| # | Problem | Consequence |
|---|---|---|
| P1 | Stock is updated by hand and separately from sales | Counts drift from reality; items are sold that are not in stock |
| P2 | Existing Excel data cannot move into a system easily, and data still has to leave as Excel | Fear of migration; double work |
| P3 | Spreadsheets keep no reliable record of who changed stock or prices, or when | No accountability; errors cannot be traced |
| P4 | Warranty cases have no structure (customer, supplier/service provider, status, dates) | Lost products, forgotten follow-ups, unhappy customers |
| P5 | Full ERP and repair-management tools are too big, costly and complex | Small stores do not adopt them |
| P6 | Staff are not all equally trained, and often work from phone or tablet | The solution must be simple and responsive |

## 3. Who is affected

- **Owner/Admin:** cannot trust stock figures or margins; spends time reconciling.
- **Staff:** slow lookups, mistakes at the counter.
- **Customers:** lost or delayed warranty repairs.

## 4. Root causes

1. No single source of truth for stock and sales.
2. No enforced rules (for example, nothing stops a sale of unavailable stock).
3. No audit trail.
4. No workflow for warranty cases.

## 5. Desired outcome

A simple web system where a sale reduces stock in the same step, every change is traceable, existing Excel data can be imported with a clear validation report, reports come from live data, and a warranty case can be followed from claim to supplier return to customer collection.

## 6. Why not an ERP or a spreadsheet template?

- ERP: too much scope, cost and training for a small store.
- Spreadsheet template: still no enforced rules, no roles, no audit, no concurrency safety.

## 7. Evidence and verification

Representative PC hardware store catalog data and realistic import/export templates (Intel, MSI, Corsair, WD, Kingston) are established and verified in the test suite and seed migrations (resolving open item **O-03**).

