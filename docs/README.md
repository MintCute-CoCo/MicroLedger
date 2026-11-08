# MicroLedger Documentation Hub 📚

> **Responsive Web POS, Transactional Inventory Ledger & Warranty Tracking System**  
> Comprehensive documentation suite organized by domain for academic reviewers, developers, and system evaluators.  
> **Release (v1.0-fullstack):** Full-Stack Retail Operations System featuring the Vue 3 Client (`client/`), Modular Express 5 API (`server/`), PostgreSQL database, and Living Documentation (`docs/`). The client requires the API; standalone offline mode is out of scope per SRS §1.2. See [`management/STATUS.md`](management/STATUS.md).

---

## 🧭 Documentation Map & Organization

All documentation has been structured into dedicated domain folders to make navigation effortless:

```text
docs/
├── foundation/       # Project Charter, Business Rationale, Objectives & Scope
├── requirements/     # Formal Specifications (SRS, Stories, Roles, Acceptance Criteria)
├── architecture/     # Technical Design (System Architecture, DB Design, UI/UX Wireframes)
├── diagrams/         # Standalone Interactive HTML Architecture, Workflow & Dataflow Diagrams
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
| [**UI/UX Design & Wireframes**](architecture/UI_UX_WIREFRAMES.md) | Vuetify 3 design system, strict tokenized color palette, universal typography scale, 8:4 desktop POS split, and responsive wireframes. |

---

## 📐 3.1. Standalone Interactive Diagrams Hub (`docs/diagrams/`)

Interactive visual architecture diagrams rendered with Archify, viewable directly in any web browser with element inspection and light/dark theme toggle:

| Diagram | Purpose & Focus | Direct Link |
|---|---|---|
| [**Diagrams Portal**](diagrams/index.html) | Unified interactive dashboard allowing instant tabbed switching across all system diagrams | [Open Portal](diagrams/index.html) |
| [**Full Operations Workflow**](diagrams/workflow/workflow.html) | Complete cashier checkout, serial capture, atomic stock guard, and printable thermal receipt issuance | [Open Workflow](diagrams/workflow/workflow.html) |
| [**System Architecture**](diagrams/architecture/architecture.html) | Multi-tier topology, client SPA, Express 5 REST API, Knex pool, and PostgreSQL 16 security groups | [Open Architecture](diagrams/architecture/architecture.html) |
| [**Transaction Sequences**](diagrams/sequence/sequence.html) | API sequences, idempotency lock acquisition, atomic conditional stock updates, and Excel export streaming | [Open Sequence](diagrams/sequence/sequence.html) |
| [**Ledger Dataflow**](diagrams/dataflow/dataflow.html) | Double-entry inventory mutations, role-based sensitive cost masking, and tamper-evident audit logging | [Open Dataflow](diagrams/dataflow/dataflow.html) |

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

## 📂 7. Interactive Architecture & Process Diagrams (`docs/diagrams/`)

Interactive standalone HTML diagrams and system explainers for browser inspection and defense presentations:

| Diagram / Visualizer | Format | Description & Scope |
|---|:---:|---|
| [**System Architecture Diagram**](diagrams/architecture/architecture.html) | Standalone HTML | Multi-tier topology, Express middleware boundaries, PostgreSQL container isolation, and client-server network separation. |
| [**Workflow & User Interaction Flow**](diagrams/workflow/workflow.html) | Standalone HTML | End-to-end POS cashier checkout, catalog searching, inventory adjustments, and 7-stage warranty claim transitions. |
| [**API Sequence & Message Lifecycle**](diagrams/sequence/sequence.html) | Standalone HTML | Deep-dive sequence diagrams tracing HTTP request lifecycles from Vue client through Express controllers to Knex transactions. |
| [**Dataflow & Mutation Pipeline**](diagrams/dataflow/dataflow.html) | Standalone HTML | Data flow pipelines tracing price snapshots, conditional stock deductions, and append-only ledger transaction rows. |
| [**Interactive System & Code Explainer**](../MicroLedger_Explainer.html) | Standalone HTML | Comprehensive defense explainer featuring Big Picture, User Journey, animated Request Tracer, and Code Explorer. |

---

## 🎓 Recommended Reading Paths

- **For Academic Examiners & Supervisors**:
  1. [`foundation/PROJECT_OVERVIEW.md`](foundation/PROJECT_OVERVIEW.md) ➔ [`foundation/OBJECTIVES.md`](foundation/OBJECTIVES.md) ➔ [`requirements/SRS.md`](requirements/SRS.md)
  2. [`architecture/SYSTEM_ARCHITECTURE.md`](architecture/SYSTEM_ARCHITECTURE.md) ➔ [`architecture/DATABASE_DESIGN.md`](architecture/DATABASE_DESIGN.md)
  3. Interactive exploration: [`diagrams/architecture/architecture.html`](diagrams/architecture/architecture.html) & [`../MicroLedger_Explainer.html`](../MicroLedger_Explainer.html)
  4. [`verification/FINAL_REPORT.md`](verification/FINAL_REPORT.md) ➔ [`verification/DEMO_SCRIPT.md`](verification/DEMO_SCRIPT.md)

- **For Software Developers & Evaluators**:
  1. [`architecture/SYSTEM_ARCHITECTURE.md`](architecture/SYSTEM_ARCHITECTURE.md) ➔ [`architecture/DATABASE_DESIGN.md`](architecture/DATABASE_DESIGN.md)
  2. [`guidelines/AI_CONTEXT.md`](guidelines/AI_CONTEXT.md) ➔ [`management/STATUS.md`](management/STATUS.md)
  3. [`verification/UAT_SETUP.md`](verification/UAT_SETUP.md) ➔ Run backend & frontend locally
