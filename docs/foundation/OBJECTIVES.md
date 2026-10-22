# Objectives

## 1. Business objectives

| ID | Objective |
|---|---|
| OBJ-1 | Provide one responsive web application for PC, tablet and mobile browsers |
| OBJ-2 | Use simple Admin/Staff roles with server-enforced permissions |
| OBJ-3 | Manage products, categories, inventory and stock movements with full history |
| OBJ-4 | Provide POS sales with automatic, atomic stock deduction and sale void |
| OBJ-5 | Store basic customer name and phone information |
| OBJ-6 | Support Excel (.xlsx) and CSV import with validation and preview, and export |
| OBJ-7 | Provide dashboard, defined reports, search/filter and an audit log |
| OBJ-8 | Provide basic supplier information and warranty/claim tracking (Phase 2) |
| OBJ-9 | Evaluate the system through functional testing and UAT against measurable targets |

## 2. Measurable targets

| Area | Target | Source |
|---|---|---|
| Overselling | Two simultaneous sales of the last unit: exactly one succeeds | NFR-08 |
| Stock integrity | For every product, stock = sum of ledger changes | SRS-INV-02 |
| Search speed | Product search within 1 s (95th percentile) at 10,000 products | NFR-02 |
| Sale speed | Sale completion within 2 s (95th percentile) | NFR-02 |
| Page load | Within 3 s on broadband | NFR-02 |
| Import | 5,000 rows / 5 MB maximum; validation within 30 s | NFR-03 |
| Usability | At least 90% of UAT staff complete a sale without help; SUS 68 or higher | NFR-01 |
| Security | Lock after 5 failed logins for 15 minutes; access token 15 minutes | NFR-05 |
| Recovery | Daily backup, 7-day retention; recovery point 24 h, recovery time 1 working day | NFR-10 |
| UAT | 100% Must cases pass, at least 90% Should cases pass, no open critical/high defects | BRD §12 |

## 3. Non-objectives

Accounting or payroll, tax calculation, payment gateway integration, e-commerce sync, multi-branch or multi-currency, offline mode, complex repair management, AI forecasting.
