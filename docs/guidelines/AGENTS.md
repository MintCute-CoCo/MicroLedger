# AGENTS.md

## Project Context

This repository contains the implementation of the project described by the Markdown documentation organized in the `docs/` directory.

The documentation is the authoritative source of truth for project requirements, architecture, scope, business rules, roles, UI/UX, and development status.

## Documentation Map

Use the following categorized documents according to the task:

### 1. Project foundation (`docs/foundation/`)
- `docs/foundation/PROJECT_OVERVIEW.md` — High-level description of the project.
- `docs/foundation/PROJECT_CHARTER.md` — Project purpose, goals, stakeholders, and constraints.
- `docs/foundation/OBJECTIVES.md` — Project objectives and intended outcomes.
- `docs/foundation/PROBLEM_STATEMENT.md` — Problem being addressed.
- `docs/foundation/SCOPE.md` — In-scope and out-of-scope functionality.
- `docs/foundation/BSR.md` — Business requirements and architectural decisions D-01..D-25.

### 2. Requirements & specifications (`docs/requirements/`)
- `docs/requirements/SRS.md` — Software requirements specification (authoritative).
- `docs/requirements/USER_STORIES.md` — User stories and user needs.
- `docs/requirements/ACCEPTANCE_CRITERIA.md` — BDD criteria (AC-001 through AC-043).
- `docs/requirements/USER_ROLES.md` — User roles, permissions, and responsibilities.
- `docs/requirements/PRD_ALIGNMENT.md` — Traceability between PRD v3.1, BRD v3.1, and SRS Appendix A.

### 3. Technical design & architecture (`docs/architecture/`)
- `docs/architecture/SYSTEM_ARCHITECTURE.md` — System architecture and technical structure.
- `docs/architecture/DATABASE_DESIGN.md` — Database schema, entities, relationships, and data rules.
- `docs/architecture/UI_UX_WIREFRAMES.md` — UI/UX structure and interface requirements.

### 4. Development management & verification (`docs/management/` & `docs/verification/`)
- `docs/management/DEVELOPMENT_ROADMAP.md` — Planned development phases and milestones.
- `docs/management/TASK_BACKLOG.md` — Current and planned implementation tasks.
- `docs/management/DEFINITION_OF_DONE.md` — Conditions required for work to be considered complete.
- `docs/management/STATUS.md` — Current project implementation status and audit tracking.
- `docs/verification/UAT_SETUP.md` — Catalog fixture setup and realistic test data specification.
- `docs/verification/UAT_SCRIPT.md` — User Acceptance Testing scenarios, execution results, and SUS evaluation.
- `docs/verification/FINAL_REPORT.md` — Comprehensive academic project report and outcomes.
- `docs/verification/DEMO_SCRIPT.md` — Presentation and walkthrough script for university defense.

### 5. Context & Guidelines (`docs/guidelines/`)
- `docs/guidelines/AI_CONTEXT.md` — Additional context and instructions intended for AI-assisted development.
- `docs/guidelines/AGENTS.md` — This operating guide for coding agents.
- `docs/README.md` — Central documentation index and navigation portal.

## Rules for Using Documentation

1. Treat the project documentation as the source of truth.
2. Read the documentation relevant to the requested task before making significant changes.
3. Do not invent requirements, roles, permissions, database relationships, or business rules when they are already documented.
4. If documents conflict, identify the conflict before implementing the change.
5. Follow `docs/foundation/SCOPE.md` and `docs/requirements/SRS.md` when determining whether functionality belongs in the project.
6. For database changes, consult `docs/architecture/DATABASE_DESIGN.md` and `docs/architecture/SYSTEM_ARCHITECTURE.md`.
7. For authentication, authorization, or role-related changes, consult `docs/requirements/USER_ROLES.md` and the relevant requirements in `docs/requirements/SRS.md`.
8. For UI changes, consult `docs/architecture/UI_UX_WIREFRAMES.md` and relevant requirements.
9. For feature implementation, check `docs/requirements/USER_STORIES.md` and `docs/requirements/ACCEPTANCE_CRITERIA.md`.
10. Check `docs/management/STATUS.md` and `docs/management/TASK_BACKLOG.md` before starting substantial work so existing progress and planned work are not duplicated.
11. Follow `docs/management/DEFINITION_OF_DONE.md` when completing implementation work.

## Change Discipline

Before implementing a significant feature:

1. Identify the relevant requirements.
2. Identify the relevant architecture/design documents.
3. Check the current project status and backlog.
4. Implement the smallest change that satisfies the documented requirements.
5. Validate the implementation against the relevant acceptance criteria.
6. Update documentation when the implementation changes an established project decision, requirement, architecture, or status.

## Conflict Handling

If implementation requirements conflict with project documentation:

- Do not silently choose one.
- Explain the conflict.
- Prefer explicit requirements and documented project decisions.
- Ask for clarification when the conflict cannot be resolved from the existing documentation.

## Quality

Prioritize:
- Correctness
- Security
- Maintainability
- Consistency with the existing architecture
- Consistency with documented requirements
- Testability
- **Readability for Academic Evaluation:** Code must be easily explainable for a university defense.
- **Explicit Logic over Brevity:** Prefer step-by-step variable assignment over dense one-line operations. Break down all array chaining (`map`, `filter`) into readable blocks.
- **Frontend Separation of Concerns:** Keep `.vue` files clean and readable. If a view or component has complex business logic, large state objects, or heavy API interactions, extract that logic into a Vue Composable (`.js` file). For simple UI components, keeping logic inline is fine, but always maintain strict vertical formatting.
- **Strict Formatting:** Do not generate squashed, minified-looking code. Every HTML tag, component attribute, and JavaScript statement must have proper vertical spacing and indentation across the entire frontend.
- **UI Consistency & Alignment:** Ensure pixel-perfect layout alignment across all panels. Do not use custom CSS or arbitrary margins/paddings that cause UI elements or headers to shift between pages. Rely exclusively on consistent Vuetify 3 spacing, typography, and responsive grid classes to maintain a smooth, cross-device experience.
