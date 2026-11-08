# Development Roadmap

> Weeks are **relative** (week 1 = project start). Fix real dates once the FYP calendar is known. Sprints are 2 weeks. Plan includes one buffer week.

## 1. Phases

| Phase | Weeks | Goal |
|---|---|---|
| 0 — Setup | 1 | Repo, CI, database, migrations, auth skeleton |
| 1 — Core (Must) | 2–11 | All Must Have features working and tested |
| 2 — Warranty (Should) | 12–15 | Low stock, suppliers, warranty, claims, serials, filtering |
| 3 — UAT and delivery | 16–18 | UAT, defect fixing, hardening, final documents and demo |

## 2. Sprint plan

| Sprint | Weeks | Scope | Backlog epics |
|---|---|---|---|
| Setup | 1 | Git repo, folders, linting, CI, local and staging database, first migrations, seed script, health endpoint | E0 |
| S1 | 2–3 | Login, token refresh, lockout, role middleware, user management, settings | E1 |
| S2 | 4–5 | Categories, products (search, CRUD), inventory ledger, stock-in, adjustment | E2, E3 |
| S3 | 6–7 | Customers, POS API and screen, sale transaction, idempotency, sales history, void | E4, E5 |
| S4 | 8–9 | Import (template, parse, preview, commit), export | E6 |
| S5 | 10–11 | Dashboard, reports, audit log screen, hardening, concurrency and rollback tests, backup restore drill | E7, E8 |
| S6 | 12–13 | Low-stock alert, suppliers, warranty records, claims create and transitions | E9, E10 (part) |
| S7 | 14–15 | Return tracking and overdue, serial numbers, advanced filtering, warranty report | E10, E11 |
| S8 (Polish) | 16 | Frontend decomposition, API-only data flow, anti-slop audit, Vuetify table refactoring | E13 |
| S9 (Integration) | 17 | Backend Express integration, CI PostgreSQL workflow, load benchmarks | E14 |
| UAT | 17 | UAT with at least 1 Admin and 2 Staff over 500-item catalog, SUS evaluation | E12 |
| Final | 18 | Final fixes, living documentation sync, committee demo rehearsal | E12 |

## 3. Milestones and exit gates

| Milestone | Week | Gate | Status |
|---|---|---|:---:|
| **M0 Setup done** | 1 | CI runs; app starts; migrations apply to an empty database | **ACHIEVED** |
| **M1 Phase 1 complete** | 11 | AC-001 to AC-033 pass; concurrent-sale and rollback tests pass; backup restore tested | **REASSESS — T-131** |
| **M2 Phase 2 complete** | 15 | AC-034 to AC-043 pass; claim tracked from creation to collection | **ACHIEVED** |
| **M3 Backend Release & UAT** | 17 | 100% Must and at least 90% Should cases pass; no open critical/high defects; SUS 68 or higher; full-stack CI passing on PostgreSQL 16 | **ACHIEVED** |
| **M4 Final delivery** | 18 | Documents, code, deployed system and demo ready; committee defense rehearsal | **IN PROGRESS** |

## 4. Recent Completed Work

- Standalone demo engine removal completed; browser data access now follows the API-only boundary (SRS §1.2; T-125).
- Claims form reference-data failures now surface to users instead of being silently ignored (T-126).
- Updated the architecture diagram to show API configuration instead of the removed demo engine (T-127).
- Reconciled T-091 (report & presentation preparation) with the active M4 oral defense milestone (T-128).
- Codified system design consultation, task completion marking, and defect disclosure tracking rules (T-124).
- Read-only backend and Markdown audit found destructive database scripts without safeguards, runtime grants that do not protect all immutable records, incomplete backup/restore evidence, production-hardening gaps, and overstated verification claims (T-129–T-134).

## 5. Dependencies (Resolved)

- Real sample Excel files and PC hardware catalog (O-03) verified in S4 with import/export templates.
- Container architecture and PostgreSQL 16 integration are in place; least-privilege grants and HTTPS production deployment still need verification (T-099, T-130, T-132).
- Daily backup, seven-day retention, and restore recovery remain open until a complete backup is restored and checked in an isolated database (T-131).
- Currency (VND) and time zone (`Asia/Ho_Chi_Minh` via container `TZ`) (O-01, O-02) resolved for receipts and reports.
- UAT participants (1 Admin, 2 Staff) (O-06) verified with SUS 90/100 score.
## 6. Risk buffer rules

- If Phase 1 slips past week 11, drop Should items first (never Must). Phase 2 items are cut from the end: filtering, serials, then advanced reports.
- Could Have items start only after the UAT gate is passed.
- Any scope change follows the rule in `../foundation/SCOPE.md`.

## 7. Working rhythm

- Start each sprint by choosing backlog tasks (`TASK_BACKLOG.md`); end it with a demo and a `STATUS.md` update.
- Each task follows `DEFINITION_OF_DONE.md`.
- Run the full test suite before merging to the main branch.
- **Mandatory Management Synchronization:** Update all records in `docs/management/` immediately whenever code changes are committed. Management documentation must never lag behind the codebase.
