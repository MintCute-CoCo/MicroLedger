# MicroLedger Interactive Diagrams Hub

This directory contains standalone, interactive visual architecture diagrams rendered via **Archify**, viewable directly in any browser with light/dark themes, node element inspection, and motion tracing.

---

## 🧭 Master Diagrams Portal

Open [`index.html`](index.html) to interactively explore and switch between all system diagrams in one unified view.

| Diagram | Focus & Operational Scope | Standalone Link |
|---|---|---|
| **Full Operations Workflow** | Step-by-step cashier checkout, serial capture, atomic stock guard, and printable thermal receipt issuance | [workflow/workflow.html](workflow/workflow.html) |
| **System Architecture** | Multi-tier boundaries, frontend-to-backend communication, Knex connection pooling, and PostgreSQL role isolation | [architecture/architecture.html](architecture/architecture.html) |
| **Transaction Sequences** | API request lifecycles, idempotency lock acquisition, atomic conditional updates, and Excel streaming | [sequence/sequence.html](sequence/sequence.html) |
| **Ledger Dataflow** | Double-entry inventory mutations, role-based sensitive data redaction, and audit logging | [dataflow/dataflow.html](dataflow/dataflow.html) |
| **Interactive Explainer** | Unified one-page executive overview, animated request tracer, and academic defense guide | [MicroLedger_Explainer.html](../../MicroLedger_Explainer.html) |

---

## 🛠️ Regeneration & Authoring

Each diagram is governed by its versioned `candidate.json` specification:

```powershell
# Deliver updated workflow diagram
node .agents/skills/archify/bin/archify.mjs deliver workflow docs/diagrams/workflow/candidate.json docs/diagrams/workflow/workflow.html --quality showcase --json
```
