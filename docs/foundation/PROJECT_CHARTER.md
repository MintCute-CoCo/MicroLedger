# Project Charter

| | |
|---|---|
| **Project title** | MicroLedger — Responsive Web POS, Inventory & Warranty Tracking |
| **Type** | Final Year Project (FYP) |
| **Version** | 1.0 (baseline BRD/PRD v3.1, SRS v1.0) |
| **Last updated** | 4 October 2026 |

## 1. Background

Small retailers selling household, electrical and furniture products often track stock and sales in Excel. Stock drifts from reality, price and stock changes leave no trail, and warranty cases are followed up by memory or chat messages.

## 2. Purpose

Build a lightweight, low-cost web system that replaces the spreadsheet workflow with a reliable single source of truth, while allowing existing Excel data to be imported and data to be exported again.

## 3. Objectives

See `OBJECTIVES.md`. In short: one responsive app; Admin/Staff roles; safe POS with automatic stock deduction; Excel/CSV import with preview; reports and audit; warranty and claim tracking.

## 4. Scope summary

- **In:** Phase 1 Core (Must), Phase 2 Warranty (Should).
- **Out:** accounting, tax calculation, payment gateways, multi-branch, offline mode, repair management, AI forecasting.

Details in `SCOPE.md`.

## 5. Deliverables

| # | Deliverable |
|---|---|
| 1 | Working web application (Phase 1 and Phase 2) deployed on a staging/UAT environment |
| 2 | Source code in Git with automated tests and CI |
| 3 | Documentation set: BRD, PRD, SRS and this markdown pack |
| 4 | Import template (.xlsx and .csv) |
| 5 | UAT report with results and defect log |
| 6 | Final FYP report and demonstration |

## 6. Stakeholders and responsibilities

| Stakeholder | Responsibility |
|---|---|
| Student / developer | Analysis, design, implementation, testing, documentation |
| Supervisor / assessor | Guidance, review of documents, assessment |
| Store owner / client (to be named) | Provide sample Excel files and answer open decisions; act as Admin in UAT |
| Staff testers (at least 2) | Take part in UAT as Staff users |

## 7. Assumptions

- One store, one currency, one branch.
- Planning capacity: up to 10,000 products, about 500 sales per day, up to 5 concurrent users.
- Real sample Excel files and PC hardware store catalog verified (O-03 resolved).
- Containerized deployment and PostgreSQL 16 append-only security verified (O-04, O-05 resolved).

## 8. Constraints

- FYP time and a single developer.
- Low-cost hosting (API instances may sleep when idle; file system is temporary).
- Warranty tracking must not grow into repair-shop software.

## 9. Top risks

| Risk | Control |
|---|---|
| Messy Excel files | Template, mapping, validation report, preview before commit |
| Sale/stock inconsistency | One transaction per sale, conditional stock update, CHECK constraint, concurrent-sale test |
| Data loss | Daily backup, 7-day retention, restore drill before UAT |
| Free hosting sleeps | Always-on instance or pre-warm for UAT and demo |
| Scope creep | Must/Should/Could, locked out-of-scope list, phase exit criteria |

## 10. Success criteria

Measured in UAT: 100% of Must test cases pass, at least 90% of Should cases pass, no open critical/high defects, SUS score of 68 or higher, at least 90% of staff complete a sale without help. Full list in `OBJECTIVES.md` and `../requirements/ACCEPTANCE_CRITERIA.md`.

## 11. Milestones (relative weeks)

See `../management/DEVELOPMENT_ROADMAP.md`: M0 setup (week 1), M1 Phase 1 complete (week 11), M2 Phase 2 complete (week 15), M3 UAT done (week 17), M4 final delivery (week 18). Dates are fixed once the FYP calendar is known.

## 12. Approval

| Name | Role | Signature | Date |
|---|---|---|---|
| | Student | | |
| | Supervisor | | |
| | Client (if applicable) | | |
