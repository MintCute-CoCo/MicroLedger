# MicroLedger Documentation Hub 📚

> **Responsive Web POS, Transactional Inventory Ledger & Warranty Tracking System**  
> Comprehensive documentation suite organized by domain for academic reviewers, developers, and system evaluators.  
> **Release (v1.0-frontend):** Complete Frontend Web Application (`client/`) and System Documentation (`docs/`). Backend services staged for subsequent release. See [`management/STATUS.md`](management/STATUS.md).

---

## 🧭 Documentation Map & Organization

All documentation has been structured into dedicated domain folders to make navigation effortless:

```text
docs/
├── foundation/       # Project Charter, Business Rationale, Objectives & Scope
├── requirements/     # Formal Specifications (SRS, Stories, Roles, Acceptance Criteria)
├── architecture/     # Technical Design (System Architecture, DB Design, UI/UX Wireframes)
├── management/       # Development Roadmap, Backlog, DoD & Live Status Tracking
├── verification/     # UAT Scripts, Setup Guides, Final FYP Report & Defense Demo
├── guidelines/       # AI Guidelines, Agent Discipline & Coding Standards
└── README.md         # Master Documentation Index (this file)
```

---

## 📂 1. Project Foundation (`docs/foundation/`)

Documents establishing the business context, goals, and boundaries of the project:

| Document | Purpose & Content |
|---|---|
| [**Project Overview**](foundation/PROJECT_OVERVIEW.md) | High-level executive summary, target store profile, and core problem overview. |
| [**Project Charter**](foundation/PROJECT_CHARTER.md) | Formal FYP project charter, project objectives, stakeholders, constraints, and success factors. |
| [**Problem Statement**](foundation/PROBLEM_STATEMENT.md) | Breakdown of spreadsheet-induced stock drift, missing audit trails, and customer warranty disputes. |
| [**Measurable Objectives**](foundation/OBJECTIVES.md) | Specific quantitative targets (inventory discrepancy = 0, P95 response < 1s, SUS ≥ 68). |
| [**Scope Definition**](foundation/SCOPE.md) | Boundaries defining Must Have, Should Have, and explicitly Out-of-Scope capabilities. |
| [**Business Requirements (BSR)**](foundation/BSR.md) | Authoritative business requirements (from BRD v3.1), architectural decisions D-01 through D-25. |

---

## 📂 2. Requirements & Specifications (`docs/requirements/`)

Detailed functional and non-functional specifications:

| Document | Purpose & Content |
|---|---|
| [**Software Requirements (SRS)**](requirements/SRS.md) | Authoritative, formal software specification (SRS v1.0) governing all system functionality. |
| [**User Roles & RBAC Matrix**](requirements/USER_ROLES.md) | Granular Admin vs Staff access matrix; staff cost-masking and security boundary definitions. |
| [**User Stories**](requirements/USER_STORIES.md) | User stories and persona needs organized by functional capability. |
| [**Acceptance Criteria**](requirements/ACCEPTANCE_CRITERIA.md) | BDD Given/When/Then test criteria for all 43 functional scenarios (AC-001 through AC-043). |
| [**PRD Alignment Matrix**](requirements/PRD_ALIGNMENT.md) | Bidirectional traceability linking PRD v3.1, BRD v3.1, and SRS Appendix A items. |

---

## 📂 3. Technical Design & Architecture (`docs/architecture/`)

System blueprints, database schemas, and interface wireframes:

| Document | Purpose & Content |
|---|---|
| [**System Architecture**](architecture/SYSTEM_ARCHITECTURE.md) | Multi-tier architecture, request flows, Knex query parameterization, and database isolation. |
| [**Database Design**](architecture/DATABASE_DESIGN.md) | Complete 16-table PostgreSQL 16 relational schema, Knex migrations, sequences, and SQL invariants. |
| [**UI/UX Design & Wireframes**](architecture/UI_UX_WIREFRAMES.md) | Vuetify 3 design system, universal typography scale, 8:4 desktop POS split, and responsive wireframes. |

---

## 📂 4. Project Management & Progress (`docs/management/`)

Sprints, tasks, deliverables, and current progress:

| Document | Purpose & Content |
|---|---|
| [**Development Roadmap**](management/DEVELOPMENT_ROADMAP.md) | Phased milestones (M0 through M4), sprint breakdown, and exit criteria. |
| [**Task Backlog**](management/TASK_BACKLOG.md) | Granular task tracking (T-001 through T-111) with size, priority, and dependency chains. |
| [**Project Status**](management/STATUS.md) | Current implementation state, frontend refactoring notes, and active verification gates. |
| [**Definition of Done**](management/DEFINITION_OF_DONE.md) | Quality gates, test requirements, and acceptance standards for completed work. |

---

## 📂 5. Verification, UAT & Defense (`docs/verification/`)

Testing protocols, test datasets, academic project reports, and live defense guides:

| Document | Purpose & Content |
|---|---|
| [**UAT Setup & Seed Guide**](verification/UAT_SETUP.md) | Instructions for seeding the 500-product catalog and authentic Vietnamese PC hardware store. |
| [**UAT Script & Execution Report**](verification/UAT_SCRIPT.md) | Step-by-step user acceptance test scenarios and System Usability Scale (SUS) score (90.0/100). |
| [**Final Project Report**](verification/FINAL_REPORT.md) | Comprehensive academic Final Year Project report detailing methodology, metrics, and outcomes. |
| [**Demonstration Script**](verification/DEMO_SCRIPT.md) | Timed walkthrough script with talking points and model Q&A for the FYP defense committee. |

---

## 📂 6. Development Guidelines (`docs/guidelines/`)

Rules and constraints for engineers and AI coding assistants:

| Document | Purpose & Content |
|---|---|
| [**AI Context & Engineering Rules**](guidelines/AI_CONTEXT.md) | Non-negotiable architectural invariants, database rules, and student coding standards. |
| [**Agent Guidelines (AGENTS.md)**](guidelines/AGENTS.md) | Operating principles and change disciplines for autonomous AI coding agents. |

---

## 🎓 Recommended Reading Paths

- **For Academic Examiners & Supervisors**:
  1. [`foundation/PROJECT_OVERVIEW.md`](foundation/PROJECT_OVERVIEW.md) ➔ [`foundation/OBJECTIVES.md`](foundation/OBJECTIVES.md) ➔ [`requirements/SRS.md`](requirements/SRS.md)
  2. [`architecture/SYSTEM_ARCHITECTURE.md`](architecture/SYSTEM_ARCHITECTURE.md) ➔ [`architecture/DATABASE_DESIGN.md`](architecture/DATABASE_DESIGN.md)
  3. [`verification/FINAL_REPORT.md`](verification/FINAL_REPORT.md) ➔ [`verification/DEMO_SCRIPT.md`](verification/DEMO_SCRIPT.md)

- **For Software Developers & Evaluators**:
  1. [`architecture/SYSTEM_ARCHITECTURE.md`](architecture/SYSTEM_ARCHITECTURE.md) ➔ [`architecture/DATABASE_DESIGN.md`](architecture/DATABASE_DESIGN.md)
  2. [`guidelines/AI_CONTEXT.md`](guidelines/AI_CONTEXT.md) ➔ [`management/STATUS.md`](management/STATUS.md)
  3. [`verification/UAT_SETUP.md`](verification/UAT_SETUP.md) ➔ Run backend & frontend locally
