# MicroLedger FYP Defense: Demonstration Script

> **Project Title:** MicroLedger — Responsive Web POS, Inventory & Warranty Tracking  
> **Academic Context:** Final Year Project (FYP) Defense  
> **Duration:** ~15–20 minutes  
> **Target Audience:** FYP Assessment Committee, Academic Supervisors, External Examiners  
> **Presenter:** FYP Student / Engineering Lead  

---

## 1. Demo Objectives & Pre-Flight Checklist

### Objectives
1. Demonstrate how MicroLedger replaces error-prone spreadsheets with an authoritative PostgreSQL ledger.
2. Demonstrate core workflows: POS checkout, role security, inventory audit trails, Excel imports, and the 7-status warranty claims lifecycle.
3. Highlight architectural guarantees: atomic stock deduction, ledger invariant ($\Delta = 0$), append-only database security (`app_user`), and responsive UI across desktop and mobile.

### Pre-Demo Checklist (2 minutes before presentation)
- [ ] Backend API running: `http://localhost:3000` (`npm run dev` in `server/`).
- [ ] Frontend client running: `http://localhost:5173` (`npm run dev` in `client/`).
- [ ] Realistic PC hardware catalog seeded: `npm run seed:pc` (or `npm run seed:uat` for 500 products).
- [ ] Two browser tabs or windows open:
  - **Window A (Desktop view)**: Chrome Incognito for **Admin** (`admin` / `adminpassword123`)
  - **Window B (Mobile Device Emulation - 360 px width)**: Chrome Device Mode for **Staff** (`minhanh` / `staffpassword123`)
- [ ] Terminal window open to run automated test verification.

---

## 2. Timed Demonstration Walkthrough

### Part 1: Problem Statement & Value Proposition (2 Mins)
- **Presenter Narrative:**
  > "Good morning / afternoon members of the examination committee. Small retail businesses selling electronics, computer hardware, and appliances face a persistent operational dilemma: commercial enterprise ERP systems are bloated and cost-prohibitive, while Excel spreadsheets inevitably lead to stock drift, missing audit trails, and lost warranty records.  
  > MicroLedger is a lightweight, responsive retail web application built on a single source of truth: PostgreSQL 16. It mathematically guarantees that physical stock always matches the transaction ledger, secures wholesale cost margins from store staff, and streamlines POS sales, spreadsheet imports, and warranty claims."

---

### Part 2: Role Security & Staff Cost-Masking (2 Mins)
- **Action:** Open Window B (Mobile / Staff view). Log in as `minhanh`.
- **Showcase:**
  1. Navigate to **Catalogue / Products**.
  2. Notice that the catalog displays product names, SKUs, and retail selling prices, but **Cost Price** is completely invisible.
  3. Notice that administrative modules (User Management, System Settings, Sales Voiding, Excel Import/Export) are inaccessible or hidden.
- **Key Defense Point:**
  > "Role enforcement is not just cosmetic UI hiding. The backend controller and service explicitly scrub cost prices and profit margin calculations from the JSON response before sending it over HTTP. Even if a cashier inspects the browser DevTools network tab, sensitive wholesale margins are never leaked."

---

### Part 3: Responsive POS Checkout & Atomic Stock Deduction (3 Mins)
- **Action:** Stay in Window B (Mobile view, width = 360 px).
- **Showcase:**
  1. Click **POS** in the navigation bar.
  2. Search for a product (e.g. `CPU-INT-12400F` or `Kingston`). Note instantaneous ranked lookup.
  3. Add the item to cart. Add it a second time: show that line items are automatically merged rather than duplicated.
  4. Tap the **Cart** bottom sheet on mobile. Show the ergonomic 44 px touch buttons for quantity increment.
  5. Select an existing customer or enter customer name `Nguyen Van A` with phone `0901234567`.
  6. Apply a 50,000 VND discount. Show dynamic subtotal and total calculation.
  7. Select payment method **Cash** and click **Complete Sale**.
  8. Show the completed receipt modal displaying the sequential sale number (`S-000001`).
- **Key Defense Point:**
  > "Every checkout utilizes an `Idempotency-Key` header. If network instability causes the client to submit the order twice, the server returns the original completed receipt without double-charging or deducting stock twice. Furthermore, stock deduction uses a conditional update `WHERE stock_qty >= requested_qty`, guaranteeing stock can never go negative even under high concurrent traffic."

---

### Part 4: Stock Movement Ledger & Invariant Verification (2 Mins)
- **Action:** Switch to Window A (Admin view). Navigate to **Inventory**.
- **Showcase:**
  1. Locate the sold hardware item. Click **Movement History**.
  2. Show the detailed audit log: see the initial `opening` from seeding, followed immediately by the `sale` record with the cashier ID and exact timestamp.
  3. Demonstrate a manual **Stock Adjustment**: Select an item, deduct 1 unit, select reason `Damaged during display demonstration`.
  4. Note that the adjustment reason is mandatory and recorded directly in the audit trail.
- **Key Defense Point:**
  > "MicroLedger implements a strict Ledger Invariant. Stock quantity cannot be edited directly; it can only change through transactional ledger entries. The mathematical sum of all inventory transactions always equals the current physical stock on shelf."

---

### Part 5: Admin Sale Void & Integrity Guards (2 Mins)
- **Action:** In Window A (Admin view), navigate to **Sales History**.
- **Showcase:**
  1. Open the sale completed during Part 3.
  2. Click **Void Sale**. Enter reason: `Customer requested instant cancellation within 5 minutes`.
  3. Confirm void.
  4. Return to **Inventory**: show that the product's stock has been automatically restored, with an associated `void_reversal` movement in the transaction ledger.
- **Key Defense Point:**
  > "Only Administrators can void sales. Furthermore, per SRS-VOID-05, if a customer has already opened an active warranty claim against items in a sale, the system prevents the sale from being voided, preventing fraud and orphaned claim records."

---

### Part 6: Serial Numbers & 7-Stage Warranty Lifecycle (4 Mins)
- **Action:** In Window A, go to **POS**.
- **Showcase:**
  1. Add a serial-tracked product (`MSI RTX 4060 Ventus 2X`, warranty period: 36 months).
  2. Notice that the checkout prompts for a **Serial Number**. Input `SN-MSI-4060-0812`.
  3. Complete the sale with customer phone `0988776655`.
  4. Navigate to **Warranty Claims**.
  5. Search warranty by serial `SN-MSI-4060-0812`. Click **Create Claim**.
  6. Enter defect: `Artifacting under load on DisplayPort 1`. Status is now `Submitted`.
  7. Click **Send to Supplier**: Select supplier `MSI Vietnam Service Center`, set expected return date (e.g. 5 days from today). Status becomes `With Supplier`.
  8. Highlight the **Days with Supplier** and **Overdue** calculation computed dynamically in the store's configured time zone (`Asia/Ho_Chi_Minh`).
  9. Transition through **Returned from Supplier** to **Ready for Customer**.
  10. Finalize by completing the claim: enter resolution `repaired` with note `Replaced power board`. Status becomes `Completed`.
- **Key Defense Point:**
  > "The warranty claims engine implements a rigorous 7-status state machine (BR-16). Claims cannot skip intermediate steps, and every status change is captured with user identity, timestamp, and notes in an immutable history trail."

---

### Part 7: Excel Bulk Import & Formula Injection Protection (2 Mins)
- **Action:** Navigate to **Imports** as Admin.
- **Showcase:**
  1. Download the official `.xlsx` and `.csv` templates.
  2. Upload an Excel file containing sample products.
  3. Show the **Streaming Preview Table**: valid rows are flagged in green, while invalid rows (e.g. invalid numbers, blank names) are flagged with exact row numbers and validation reasons.
  4. Point out that the preview is streamed directly in memory with a 60-minute expiry time—uploaded files are never left unmanaged on disk.
  5. Mention export security: when exporting to CSV, any text starting with `=`, `+`, `-`, or `@` is neutralized to prevent spreadsheet formula injection attacks.

---

### Part 8: Verification & Quality Assurance Summary (2 Mins)
- **Action:** Bring up the terminal.
- **Showcase:**
  1. Run `npm test` in `server/`.
  2. Show that all automated acceptance test suites pass with 100% green status.
  3. Run `node scripts/load-test.js` to demonstrate real-time load performance:
     - Search latency: **8.86 ms** (target $\le 1,000$ ms)
     - Sale transaction latency: **15.80 ms** (target $\le 2,000$ ms)
  4. Highlight the **Database Security Constraint (NFR-12)**:
     - Show that the PostgreSQL application user role `app_user` has `UPDATE` and `DELETE` revoked on `audit_logs` and `inventory_transactions`. Even a rogue SQL injection cannot alter audit history.
  5. Reference the **UAT SUS Usability Score of 90.0 / 100** (Grade A+).

---

## 3. Potential Defense Questions & Model Answers

| Question | Recommended Answer |
|---|---|
| **Q1: How do you prevent race conditions when two cashiers sell the last unit simultaneously?** | We execute stock deduction inside a PostgreSQL transaction using a conditional update: `UPDATE products SET stock_qty = stock_qty - $q WHERE id = $id AND status = 'active' AND stock_qty >= $q RETURNING stock_qty`. PostgreSQL enforces row-level locking during the write. The first cashier's update succeeds and decrements stock to 0; the second cashier's update matches 0 rows, triggering an instant 409 `INSUFFICIENT_STOCK` rollback. Verified in `pos-sales-and-void.test.js`. |
| **Q2: Why did you separate the Warranty entity from the Sales Receipt?** | Sales receipts must remain immutable historical records. If a customer changes their phone number or if an appliance is gifted to another user who brings it in for warranty service, updating the sale would violate audit integrity. By linking warranties to serial numbers and attaching customer info to the warranty record, sales remain strictly immutable. |
| **Q3: How does the system ensure tamper-proof audit logging?** | Beyond application-level safeguards, we enforce security at the PostgreSQL permission layer. The database role used by Express (`app_user`) has `UPDATE` and `DELETE` explicitly REVOKED on `audit_logs` and `inventory_transactions`. Only `INSERT` and `SELECT` are granted. Even if an attacker exploited a remote code execution bug, the database engine would reject any modification to audit records. Verified in `security-append-only.test.js`. |
| **Q4: How do you handle large Excel file uploads without crashing the server?** | We use ExcelJS memory streaming parsers with strict size limits (5 MB max) and cap exports at 50,000 rows. Files are processed in memory and classified into JSON previews with a 60-minute TTL in `import_logs`, avoiding file system clutter and memory leakage. |

---

## 4. Conclusion & Closing Statement
> "In conclusion, MicroLedger delivers an enterprise-grade, lightweight, and responsive retail operations platform designed specifically for small businesses. Every requirement across BRD v3.1, PRD v3.1, and SRS v1.0 has been systematically implemented, verified, and hardened. Thank you, and I welcome your questions."
