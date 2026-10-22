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
| UAT | 16–17 | UAT with at least 1 Admin and 2 Staff, performance tests, fixes | E12 |
| Final | 18 | Final fixes, documentation, report, demo rehearsal | E12 |

## 3. Milestones and exit gates

| Milestone | Week | Gate |
|---|---|---|
| M0 Setup done | 1 | CI runs; app starts; migrations apply to an empty database |
| M1 Phase 1 complete | 11 | AC-001 to AC-033 pass; concurrent-sale and rollback tests pass; backup restore tested |
| M2 Phase 2 complete | 15 | AC-034 to AC-043 pass; claim tracked from creation to collection |
| M3 UAT complete | 17 | 100% Must and at least 90% Should cases pass; no open critical/high defects; SUS 68 or higher |
| M4 Final delivery | 18 | Documents, code, deployed system and demo ready |

## 4. Dependencies (Resolved)

- Real sample Excel files and PC hardware catalog (O-03) verified in S4 with import/export templates.
- Hosting plan and database architecture (O-04, O-05) verified with containerized deployment and PostgreSQL 16 append-only security.
- Currency (VND) and time zone (`Asia/Ho_Chi_Minh` via container `TZ`) (O-01, O-02) resolved for receipts and reports.
- UAT participants (1 Admin, 2 Staff) (O-06) verified with SUS 90/100 score.

## 5. Risk buffer rules

- If Phase 1 slips past week 11, drop Should items first (never Must). Phase 2 items are cut from the end: filtering, serials, then advanced reports.
- Could Have items start only after the UAT gate is passed.
- Any scope change follows the rule in `../foundation/SCOPE.md`.

## 6. Working rhythm

- Start each sprint by choosing backlog tasks (`TASK_BACKLOG.md`); end it with a demo and a `STATUS.md` update.
- Each task follows `DEFINITION_OF_DONE.md`.
- Run the full test suite before merging to the main branch.
