# MicroLedger ⚡

> **Responsive Web POS, Transactional Inventory Ledger & Warranty Tracking System for Retail**  
> *Designed for small retail stores and PC hardware/electronics merchants.*  
> **Release (v1.0-frontend):** Complete Frontend Web Application (`client/`) and System Documentation (`docs/`). Backend services staged for subsequent release. See [`STATUS.md`](docs/management/STATUS.md).

[![CI Pipeline](https://github.com/MintCute-CoCo/MicroLedger/actions/workflows/ci.yml/badge.svg)](https://github.com/MintCute-CoCo/MicroLedger/actions/workflows/ci.yml)
![Vue 3](https://img.shields.io/badge/Vue_3.5-4FC08D?style=flat-square&logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Vuetify 3](https://img.shields.io/badge/Vuetify_3-1867C0?style=flat-square&logo=vuetify&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_20_LTS-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)

---

## 📖 Overview

**MicroLedger** is a high-reliability, lightweight web application built to replace error-prone spreadsheets and fragmented manual workflows in small retail environments. Designed specifically around real-world retail constraints (demonstrated with authentic PC hardware and electronics inventory), MicroLedger delivers **one responsive application** optimized for desktop monitors, tablets, and mobile devices.

Unlike typical POS prototypes, MicroLedger enforces **transactional financial-grade inventory accounting**: every stock movement is recorded in an immutable, append-only ledger with zero possibility of negative stock, backed by strict PostgreSQL invariants and database user privilege isolation.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Architecture & Invariants](#-architecture--invariants)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Quick Start](#-quick-start)
  - [Option A: Standalone Demo Mode (Zero DB Setup)](#option-a-standalone-demo-mode-instant-preview)
  - [Option B: Full-Stack Setup with PostgreSQL](#option-b-full-stack-setup-with-postgresql)
- [Default Seed Accounts](#-default-seed-accounts)
- [Available Scripts](#-available-scripts)
- [Automated Testing & Benchmarks](#-automated-testing--benchmarks)
- [Documentation Index](#-documentation-index)
- [Contributing & Coding Standards](#-contributing--coding-standards)
- [License](#-license)

---

## ✨ Key Features

### 🛒 High-Efficiency Point of Sale (POS)
- **Fast, Streamlined Checkout**: Instant search across active products by name, SKU, or category; touch-ready cart controls with automated total and line calculations.
- **Serial Number & Warranty Capture**: Automatic detection of serialized hardware with per-item serial assignment during checkout.
- **Transactional Stock Validation**: Atomically verifies stock availability at the exact moment of sale; eliminates race conditions.
- **Payment & Receipts**: Supports Cash, Card, Bank Transfer, and Custom methods with optional flat discounts; generates clean, printable customer receipts.
- **Safe Sale Voiding**: Admins can void past sales with mandatory reason logging; automatically generates `void_reversal` ledger entries and restocks inventory.

### 📦 Append-Only Inventory Ledger
- **Financial Double-Entry Model**: Direct arbitrary edits to stock counts are prohibited. All stock alterations flow through immutable `inventory_transactions` rows.
- **Stock Movements**: Supports Stock-In (receiving purchases), Adjustments (damage, loss, manual correction), POS Sales deduction, and Void Reversals.
- **Non-Negative Invariant**: Mathematically guaranteed non-negative quantity enforced at both the business service layer and PostgreSQL database level (`CHECK (stock_qty >= 0)`).
- **Low-Stock Alerting**: Dynamic threshold monitoring highlights items requiring restock before run-outs occur.

### 🛡️ Warranty & RMA Claims Lifecycle
- **End-to-End RMA Tracking**: Full 7-stage state machine for customer warranty claims:  
  `Submitted` ➔ `With Supplier` ➔ `Returned` ➔ `Ready for Customer` ➔ `Completed` (or `Rejected` / `Cancelled`).
- **Automated Overdue Calculation**: Tracks supplier turnaround times dynamically without storing stale flags; flags overdue returns in real time.
- **Serial Number Traceability**: Links original sale items, serial tags, and claim tickets for complete customer audit history.

### 👥 Customer & Supplier Management
- **Customer CRM**: Contact profiles, total order history, and direct links to active warranty claims.
- **Supplier Directory**: Vendor management with catalog associations and RMA contact tracking.
- **Data Protection**: Soft-deactivation pattern ensures past transaction references and audit logs remain intact.

### 📊 Operational Dashboard & Analytics
- **Executive Snapshot**: Real-time daily KPIs, 7-day sales velocity charts, top-moving products, and recent activity logs.
- **Dedicated Analytical Sales Reports**: High-precision reports (`/reports/sales`) supporting arbitrary date ranges, metric aggregations (units sold, discounts, gross/net revenue), and dimensional groupings (by day, product, category, staff member, or payment method).
- **Timezone-Anchored**: Consistent business day boundaries anchored via container infrastructure (`Asia/Ho_Chi_Minh` / GMT+7).

### 📥 Bulk Import & Export
- **Two-Step Excel/CSV Import**: Upload Excel (`.xlsx`) or `.csv` spreadsheets with immediate validation preview (identifying syntax errors, unknown categories, duplicate SKUs) before executing an atomic database commit.
- **Formula Injection Defense**: Server-side ExcelJS sanitization neutralizes malicious CSV formulas (`=`, `+`, `-`, `@`).
- **Comprehensive Data Export**: One-click export of catalog and sales data formatted with UTF-8 BOM encoding for seamless Microsoft Excel compatibility.

### 🔒 Enterprise-Grade Security & Auditing
- **Strict Two-Role RBAC**: Admin vs Staff separation. Sensitive financial metrics (`cost_price`, profit margins, total inventory valuation) are strictly redacted from all Staff API responses.
- **Database Privilege Separation**: Application runtime connects via a restricted `app_user` database role with `UPDATE` and `DELETE` privileges permanently revoked on audit and ledger tables.
- **Brute-Force Protection**: 5 failed consecutive attempts trigger a 15-minute account lockout; rate-limiting applied to all authentication endpoints.
- **Tamper-Evident Audit Log**: Logs user actions, entity types, IP addresses, and state changes.

---

## 🏗️ Architecture & Invariants

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Port 5173)"]
        UI["Vue 3 + Vuetify 3 UI<br/>(Desktop / Tablet / Mobile)"]
        Router["Vue Router (Role Guards)"]
        Pinia["Pinia State Store"]
        API_Client["API Service Layer (Axios/Fetch)"]
        UI --> Router --> Pinia --> API_Client
    end

    subgraph Server["Backend API (Port 3000)"]
        MW["Middleware (Rate Limit, Auth JWT, CORS)"]
        Routes["Express 5 REST Routes (/api/v1)"]
        Controllers["Controllers (HTTP Validation via Zod)"]
        Services["Domain Services (Business Logic & Transactions)"]
        Repos["Repositories (SQL Parameterization)"]
        MW --> Routes --> Controllers --> Services --> Repos
    end

    subgraph Database["PostgreSQL 16 Database"]
        AdminRole["Owner Role (postgres)<br/>- Migrations<br/>- Schema DDL"]
        AppRole["Restricted Role (app_user)<br/>- SELECT, INSERT on all tables<br/>- REVOKE UPDATE/DELETE on ledger & audit"]
        Tables["Tables: products, sales, inventory_transactions, audit_logs...<br/>Invariant: CHECK (stock_qty >= 0)"]
        AdminRole -.-> Tables
        AppRole --> Tables
    end

    API_Client <== "JSON / REST over HTTP" ==> MW
    Repos <== "Knex Query Pool (app_user)" ==> AppRole
```

### Core System Invariants
1. **Zero Database Access from Browser**: The client communicates strictly with the backend API over HTTPS/JSON.
2. **Conditional Atomic Stock Reduction**: Stock decrements execute in an atomic transaction:
   ```sql
   UPDATE products
   SET stock_qty = stock_qty - $qty
   WHERE id = $id AND status = 'active' AND stock_qty >= $qty
   RETURNING id, stock_qty;
   ```
   If zero rows are returned, the transaction aborts immediately, preventing overselling.
3. **Immutable History**: Sale records, items, stock ledger entries (`inventory_transactions`), and `audit_logs` are write-once, append-only.
4. **Server-Enforced Pricing**: The client never transmits prices; line items are locked to authoritative backend prices at transaction commit.

---

## 💻 Tech Stack

| Domain | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | **Vue 3** (Composition API, `<script setup>`) | Modular, reactive user interface |
| **Build Tool** | **Vite 8** | Lightning-fast development & optimized production bundling |
| **Design System** | **Vuetify 3** + **MDI Icons** | Strict Material Design UI primitives, zero custom CSS hacks |
| **State Management** | **Pinia 4** | Centralized auth, cart, notification, and lookup caches |
| **Routing** | **Vue Router 4** | Route guards, authentication checks, and layout nesting |
| **Backend Framework** | **Node.js 20 LTS** + **Express 5** | High-performance RESTful API micro-architecture |
| **Schema Validation** | **Zod 4** | Strict request body and parameter validation |
| **Database** | **PostgreSQL 16** | ACID-compliant relational data store with CHECK constraints |
| **Query Builder** | **Knex 3** + **pg** | SQL parameterization, schema migrations, and seed scripts |
| **Authentication** | **jose** + **bcryptjs** | Argon2/bcrypt password hashing + rotating JWT tokens |
| **Spreadsheet Engine** | **ExcelJS 4** | Streaming server-side Excel/CSV parsing and generation |
| **Testing & Quality** | **Node.js Test Runner** + **Supertest** | Comprehensive integration, invariant, and security suites |
| **CI / Automation** | **GitHub Actions** | Automated lint, build, migration, test & load benchmarks |

---

## 📁 Repository Structure

```text
MicroLedger/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline configuration
├── client/                    # Vue 3 Frontend Application
│   ├── src/
│   │   ├── api/               # API clients grouped by domain (auth, products, sales, etc.)
│   │   ├── components/        # Reusable Vuetify components (tables, dialogs, charts)
│   │   ├── router/            # Routes, navigation metadata, and role guard guards
│   │   ├── stores/            # Pinia stores (auth, cart, notifications)
│   │   ├── utils/             # Formatters (currency, dates, badge helpers)
│   │   ├── views/             # 18 route views (16 authenticated panels + 2 auth flows)
│   │   ├── App.vue            # Root application component with layout frame
│   │   └── main.js            # Entry point initializing Vue, Vuetify, Pinia & Router
│   ├── .env.example           # Client environment template
│   └── package.json           # Frontend dependencies and build scripts
├── server/                    # Node.js / Express Backend Application
│   ├── src/
│   │   ├── config/            # Environment parsing and database connection pool
│   │   ├── db/                # Knex migrations, seed runners, and role initialization
│   │   │   ├── migrations/    # Versioned database schema migrations (16 tables)
│   │   │   └── seeds/         # Authentic PC hardware & user seed scripts
│   │   ├── middleware/        # JWT auth, role validation, rate limiting, error handling
│   │   ├── modules/           # Feature modules (auth, products, sales, inventory, claims...)
│   │   │   └── <feature>/     # Controller, Service, Repository, Schema & Routes per domain
│   │   ├── utils/             # Token helpers, currency formatters, PII log filters
│   │   └── index.js           # Express app bootstrap and HTTP server listener
│   ├── scripts/               # Backup/restore utilities and load-test benchmark script
│   ├── tests/                 # Automated integration, invariant, and security tests
│   ├── .env.example           # Server environment template
│   └── package.json           # Backend dependencies and execution scripts
├── docs/                      # Categorized specifications and architecture documents
│   ├── foundation/            # Charter, Problem Statement, Objectives, Scope & BSR
│   ├── requirements/          # SRS, User Stories, User Roles, Acceptance Criteria
│   ├── architecture/          # System Architecture, Database Design & Wireframes
│   ├── management/            # Roadmap, Task Backlog, DoD & Live Status Tracking
│   ├── verification/          # UAT Scripts, Realistic Hardware Fixtures & FYP Report
│   ├── guidelines/            # AI Guidelines & Agent Operating Rules
│   └── README.md              # Master documentation hub and reading guide
├── .gitignore                 # Git ignore rules for node_modules, build dist, and secrets
└── README.md                  # Project overview, setup guide, and documentation index
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v20 LTS or higher (`node -v`)
- **npm**: v10 or higher (`npm -v`)
- **PostgreSQL**: v16 or higher (required for Full-Stack mode; not required for Demo mode)

---

### Option A: Standalone Demo Mode (Instant Preview)

Experience MicroLedger immediately without configuring a database or backend server. The frontend includes a fully functional in-memory mock engine.

```powershell
# 1. Navigate to the client directory
cd client

# 2. Copy the environment configuration
Copy-Item .env.example .env

# 3. Enable demo mode in client/.env:
# Ensure VITE_DEMO_MODE=true

# 4. Install dependencies and start the development server
npm install
npm run dev
```

Open your browser to `http://localhost:5173`. You can immediately interact with the POS terminal, create products, trigger stock movements, and test responsive layouts.

---

### Option B: Full-Stack Setup with PostgreSQL

#### 1. Setup Backend Server & Database

```powershell
# Navigate to the server folder
cd server

# Create your environment file from the template
Copy-Item .env.example .env
```

Open `server/.env` and update the connection strings to match your PostgreSQL instance:
```ini
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/microledger
APP_DATABASE_URL=postgres://app_user:microledger_app_pass_123@localhost:5432/microledger
JWT_SECRET=development-secret-key-must-be-at-least-32-bytes-long
PORT=3000
CORS_ORIGIN=http://localhost:5173
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=adminpassword123
APP_DB_ROLE_PASSWORD=microledger_app_pass_123
```

Next, initialize the database and start the server:
```powershell
# Install backend dependencies
npm install

# Run Knex schema migrations (creates all 16 tables and indexes)
npm run migrate

# Configure the restricted app_user role with append-only permissions
npm run db:role

# Seed the database with the initial Administrator and authentic PC hardware catalog
npm run seed

# Start the API server in watch mode
npm run dev
```
The server will start on `http://localhost:3000`. Verify status at `http://localhost:3000/health`.

#### 2. Setup Frontend Client

Open a new terminal window:
```powershell
# Navigate to the client folder
cd client

# Create your environment file
Copy-Item .env.example .env
```

Ensure `client/.env` connects to the live API:
```ini
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_DEMO_MODE=false
```

Install and launch the client:
```powershell
npm install
npm run dev
```
Navigate to `http://localhost:5173` and log in with your credentials.

---

## 🔑 Default Seed Accounts

When the database is populated via `npm run seed`, the following default accounts are provisioned:

| Role | Username | Password | Access Privileges |
|---|---|---|---|
| **Admin** | `admin` | `adminpassword123` | Full access: user management, catalog, stock adjustments, void sales, settings, audit logs, financial reports |
| **Staff** | `staff` *(or UAT staff)* | Configured in seed | Operational access: POS sales, receiving stock-in, customer lookups, warranty claims. Cost prices and margins redacted. |

> *Note: For security best practices, always change default passwords in production or UAT deployments.*

---

## 🛠️ Available Scripts

### Frontend (`client/`)

| Command | Action |
|---|---|
| `npm run dev` | Starts Vite local development server with hot-module replacement |
| `npm run build` | Compiles and optimizes assets into `client/dist/` for production |
| `npm run preview` | Serves the production build locally for verification |

### Backend (`server/`)

| Command | Action |
|---|---|
| `npm run dev` | Runs the API server with Node native file watching (`node --watch`) |
| `npm start` | Launches the server in standard production mode |
| `npm run migrate` | Executes all pending Knex database migrations |
| `npm run migrate:rollback` | Rolls back the most recently executed migration batch |
| `npm run db:role` | Creates and configures the restricted `app_user` PostgreSQL role |
| `npm run seed` | Seeds default settings, administrator user, and base catalog |
| `npm run seed:pc` | Seeds authentic Vietnamese PC hardware catalog (Intel, MSI, Corsair, WD) |
| `npm run seed:uat` | Seeds 500-product enterprise catalog for UAT stress-testing |
| `npm test` | Executes the complete automated test suite using Node test runner |
| `npm run db:clean` | Truncates transactional tables while preserving schema structure |
| `npm run db:reset` | Performs a complete database wipe, re-migration, role setup, and re-seed |

---

## 🧪 Automated Testing & Benchmarks

The backend test suite covers authentication, role authorization, atomic transactions, ledger invariants, and Excel streaming:

```powershell
cd server
npm test
```

### Benchmark & Load Testing
A standalone load-testing harness verifies performance under simulated concurrency:
```powershell
cd server
node scripts/load-test.js
```
The benchmark simulates concurrent POS sales, inventory deductions, and warranty claim lookups, verifying zero deadlocks and sub-100ms response latencies.

---

## 📚 Documentation Index

MicroLedger includes a comprehensive 25-document engineering and specification suite located in the [`docs/`](docs/) directory:

| Domain | Document | Description |
|---|---|---|
| **Architecture** | [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md) | Multi-tier architectural boundaries, request lifecycles, and component interactions |
| **Architecture** | [Database Design](docs/architecture/DATABASE_DESIGN.md) | Relational schema diagrams, table structures, indexes, and SQL constraints |
| **Architecture** | [UI/UX Wireframes](docs/architecture/UI_UX_WIREFRAMES.md) | Screen layouts, responsive breakpoint behaviors, and navigation specs |
| **Requirements** | [Software Requirements (SRS)](docs/requirements/SRS.md) | Authoritative, formal software requirements specification (SRS v1.0) |
| **Requirements** | [User Roles & Permissions](docs/requirements/USER_ROLES.md) | Granular Admin vs Staff RBAC matrix and cost-masking definitions |
| **Requirements** | [Acceptance Criteria](docs/requirements/ACCEPTANCE_CRITERIA.md) | BDD Given/When/Then criteria for all core features (AC-001..AC-043) |
| **Requirements** | [PRD Alignment Matrix](docs/requirements/PRD_ALIGNMENT.md) | Bidirectional traceability between PRD v3.1, BRD v3.1, and SRS Appendix A |
| **Foundation** | [Project Overview](docs/foundation/PROJECT_OVERVIEW.md) | High-level summary, retail store context, and document map |
| **Foundation** | [Business Requirements (BSR)](docs/foundation/BSR.md) | Business rationale, user workflows, and architectural decisions D-01..D-25 |
| **Foundation** | [Project Scope](docs/foundation/SCOPE.md) | In-scope vs out-of-scope boundaries |
| **Management** | [Project Status](docs/management/STATUS.md) | Current verification status, frontend refactoring notes, and active tasks |
| **Management** | [Development Roadmap](docs/management/DEVELOPMENT_ROADMAP.md) | Milestones (M0..M4), phased deliverables, and sprint progression |
| **Management** | [Task Backlog](docs/management/TASK_BACKLOG.md) | Epic breakdowns and granular task tracking (T-001 through T-111) |
| **Management** | [Definition of Done](docs/management/DEFINITION_OF_DONE.md) | Verification criteria required for task sign-off |
| **Verification** | [UAT Setup & Seed Guide](docs/verification/UAT_SETUP.md) | Acceptance test scripts and 500-item catalog deployment guide |
| **Verification** | [UAT Script & Report](docs/verification/UAT_SCRIPT.md) | End-to-end UAT scenarios and System Usability Scale (SUS 90.0) |
| **Verification** | [Final FYP Report](docs/verification/FINAL_REPORT.md) | Comprehensive academic Final Year Project report |
| **Verification** | [Defense Demo Script](docs/verification/DEMO_SCRIPT.md) | Walkthrough script and committee Q&A for project defense |
| **Guidelines** | [AI Context & Rules](docs/guidelines/AI_CONTEXT.md) | Architectural invariants and engineering constraints for AI contributors |
| **Guidelines** | [Agent Guidelines](docs/guidelines/AGENTS.md) | Operating rules and change disciplines for coding agents |

> For a complete guide to all 25 documentation specifications, see the [**Documentation Hub**](docs/README.md).

---

## 🤝 Contributing & Coding Standards

1. **Layered Separation**: Strictly respect architectural boundaries. Repositories execute SQL queries; Services implement domain business logic; Controllers handle HTTP transport and validation.
2. **Explicit Code Over Magic**: In alignment with academic Final Year Project guidelines, avoid dense one-liners or excessive nested ternaries. Explicit variables, structured flow, and comprehensive block comments are required.
3. **Database Guardrails**: Never bypass transactional ledger rows when adjusting inventory. Always use conditional updates.
4. **Pull Requests**: Ensure `npm run build` passes in `client/` and `npm test` passes in `server/` before opening a PR.

---

## 📄 License

This project was developed as a University Final Year Project (FYP). Released under the [MIT License](LICENSE).
