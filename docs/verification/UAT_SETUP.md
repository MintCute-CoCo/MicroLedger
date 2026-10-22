# UAT Setup & Test Data Specification

> Setup protocols, seed configurations, and realistic test dataset specifications for User Acceptance Testing (UAT) and FYP defense demonstrations.

---

## 1. Strict Test Data & Seeding Rules

To ensure reliable end-to-end testing, user acceptance testing (UAT), and academic presentation fidelity, all database fixtures and seeds adhere to strict domain realism:

### Hard Prohibitions
- **NO Random Generators / Faker.js**: The use of `faker`, random string generators, or arbitrary hash concatenations (e.g., `Product_179231...`, `SKU_179...`, `Supplier_982`) is strictly forbidden across all seeds and test environments.
- **NO Generic Dummy Placeholders**: Generic placeholders such as "Test Product", "Customer One", "Reject Customer", or "Sample Supplier" are prohibited.

### Domain-Specific Realism Requirements
All seeded data and UAT records model a realistic Vietnamese PC Hardware & Electronics retail store:
1. **Authentic PC Hardware Catalogue**:
   - **Processors (CPU)**: Intel Core i5-14400F Desktop Processor, AMD Ryzen 5 7600X, etc.
   - **Motherboards**: MSI B760M Gaming Plus WiFi DDR4, ASUS TUF Gaming B650-PLUS WiFi, etc.
   - **Graphics Cards (GPU)**: MSI Gaming X Trio AMD Radeon RX 6800 XT 16GB, ASUS Dual GeForce RTX 4060, etc.
   - **Memory (RAM)**: Corsair Vengeance LPX 32GB (2x16GB) DDR4 RAM Kit, Kingston Fury Beast 16GB DDR5.
   - **Storage (SSD/HDD)**: Western Digital Black SN850X 1TB NVMe SSD, Kingston NV2 500GB PCIe 4.0 NVMe SSD.
2. **Realistic Serial Numbers**:
   - For serial-tracked components (GPUs, Motherboards, SSDs), serial numbers follow realistic vendor patterns (e.g., `SN-MSI-6800XT-001`, `SN-WD-SN850X-101`), never randomized MD5/SHA hashes.
3. **Authentic Vietnamese Names & Contacts**:
   - Customer and staff accounts use genuine Vietnamese names (e.g., "Nguyen Van A", "Bui Ngoc Lan", "Tran Minh Tuan", "Le Thi Mai").
   - Phone numbers are valid 10-digit Vietnamese format starting with valid prefixes (e.g., `090...`, `091...`, `098...`).
4. **Realistic Store Team**:
   - Seeded user accounts across the two roles:
     - 2 Admins: "System Admin" (`admin`), "Store Manager" (`manager`)
     - 4 Staff: "Cashier Minh" (`cashier1`), "Cashier Lan" (`cashier2`), "Stock Manager Tuan" (`stock1`), "Stock Assistant" (`stock2`)

---

## 2. Referential Integrity & Surgical Wipe Protocol

When cleaning or refreshing the UAT database:
1. **Core Settings & Root Admin Protection**: The `settings` table and primary administrator account are preserved during cleanup (`node src/db/clean.js`).
2. **Foreign Key Orderly Cleanup**:
   - Child tables are truncated before parent tables: `claim_status_history` → `warranty_claims` → `warranties` → `sale_item_serials` → `sale_items` → `sales` → `inventory_transactions` → `import_logs` → `audit_logs` → `products` → `categories` → `customers` → `suppliers`.
3. **Ledger Invariant Preservation**:
   - Every product seeded with stock has a corresponding `opening` movement in `inventory_transactions` within the exact same database transaction, ensuring `products.stock_qty == SUM(inventory_transactions.quantity_change)`.

---

## 3. Executing the UAT Seeds

From the `server` directory, run the relevant seed scripts:

### Standard Setup & Seeding
```powershell
cd server

# 1. Apply Knex schema migrations (16 tables)
npm run migrate

# 2. Configure restricted app_user role permissions
npm run db:role

# 3. Seed initial admin, settings, and base catalog
npm run seed
```

### Authentic PC Hardware Catalog Seed
```powershell
# Populates authentic Vietnamese PC hardware inventory (Intel, MSI, Corsair, WD, Kingston)
npm run seed:pc
```

### 500-Item Enterprise UAT Catalog Seed
```powershell
# Populates 500 catalog items for large-scale stress testing and search benchmarks
npm run seed:uat
```

### Complete Database Reset & Fresh Seed
```powershell
# Resets the schema completely, reapplies migrations, configures roles, and re-seeds
npm run db:reset
```

> **Note on Warranty Claims**: Warranty claims are not preloaded as sample records. Create them interactively through the application during UAT so that claim descriptions, resolution notes, and rejection/cancellation reasons reflect actual user input.
