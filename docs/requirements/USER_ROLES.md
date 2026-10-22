# User Roles and Permissions

## 1. Roles

The system implements a strict two-role architecture:

| Role | Database Identifier | Description | Responsibilities |
|---|---|---|---|
| **Admin** | `admin` | Store owner / General manager | Full administrative access: system configuration, user management, category/product management, stock adjustments, Excel/CSV import/export, sale voiding, sensitive financial reports (Sales & Inventory reports, stock valuation), and audit logs. |
| **Staff** | `staff` | Counter employee / Cashier | Operational daily tasks: POS sales processing, receiving stock-in, customer lookups and creation, basic sales history, operational dashboard (without cost/profit metrics), and warranty claim handling. |

> [!IMPORTANT]
> Exactly two roles exist in the system: `admin` and `staff`. There are no intermediate roles (such as Supervisor, Shift Manager, or Auditor), nor granular dynamic permissions. Anonymous access is strictly prohibited except for authentication endpoints (`/auth/login`, `/auth/refresh`).

## 2. Permission Matrix

The permissions are enforced by the API middleware (`requireRole('admin')` or authenticated session):

| Feature / Action | Admin | Staff | Enforcing Middleware / Route |
|---|:---:|:---:|---|
| **Authentication & Profile** | | | |
| Sign in, sign out, token refresh | Yes | Yes | Public / Session Auth |
| Change own password | Yes | Yes | Authenticated (`/auth/change-password`) |
| **User Management** | | | |
| View, create, update, deactivate users | Yes | No | `requireRole('admin')` (`/users`) |
| Reset user password | Yes | No | `requireRole('admin')` (`/users/:id/reset-password`) |
| **Product & Category Management** | | | |
| Create, update, deactivate categories | Yes | No | `requireRole('admin')` (`/categories`) |
| Create, update, deactivate products | Yes | No | `requireRole('admin')` (`/products`) |
| View active products and categories | Yes | Yes | Authenticated |
| View cost price, stock value, profit margins | Yes | No | Data serializer strips cost fields for Staff |
| **Inventory Operations** | | | |
| Record stock-in | Yes | Yes | Authenticated (`/inventory/stock-in`) |
| Record stock adjustment (requires reason) | Yes | No | `requireRole('admin')` (`/inventory/adjustments`) |
| View inventory list & movements | Yes | Yes | Authenticated (Staff sees quantity only, no valuation) |
| **Point of Sale (POS) & Sales** | | | |
| Process POS sale | Yes | Yes | Authenticated (`/sales`) |
| Apply sale discount & select customer | Yes | Yes | Authenticated |
| Input and validate product serial numbers | Yes | Yes | Authenticated |
| View sales history | Yes | Yes | Authenticated (Cost and profit data omitted for Staff) |
| Void a completed sale (requires reason) | Yes | No | `requireRole('admin')` (`/sales/:id/void`) |
| **Customer Management** | | | |
| Search, view, create, update customers | Yes | Yes | Authenticated (`/customers`) |
| **Bulk Data Management** | | | |
| Upload & preview Excel/CSV import | Yes | No | `requireRole('admin')` (`/imports/preview`) |
| Commit Excel/CSV import | Yes | No | `requireRole('admin')` (`/imports/:id/commit`) |
| Export data & reports (.xlsx / .csv) | Yes | No | `requireRole('admin')` (`/exports/*`) |
| **Reports & Dashboard** | | | |
| Operational Dashboard | Yes | Yes | Authenticated (`/reports/dashboard` — stock value hidden for Staff) |
| Dynamic Sales Report (Date range, filters) | Yes | No | `requireRole('admin')` (`/reports/sales`) |
| Inventory Valuation & Movement Report | Yes | No | `requireRole('admin')` (`/reports/inventory`) |
| Warranty & Overdue Claims Report | Yes | Yes | Authenticated (`/reports/warranty`) |
| **Audit Logs & Settings** | | | |
| View audit log | Yes | No | `requireRole('admin')` (`/audit-logs`) |
| View & update store currency settings | Yes | View only | `requireRole('admin')` for updates (`/settings`) |
| **Suppliers & Warranty Claims** | | | |
| Create, update, deactivate suppliers | Yes | View only | `requireRole('admin')` for write (`/suppliers`) |
| Create manual warranty | Yes | No | `requireRole('admin')` (`/warranties`) |
| Attach customer to warranty | Yes | Yes | Authenticated (`/warranties/:id`) |
| Create claim, transition normal statuses | Yes | Yes | Authenticated (`/claims`) |
| Reject or cancel a claim | Yes | No | `requireRole('admin')` (`/claims/:id/transition`) |
| Accept out-of-warranty claim | Yes | No | `requireRole('admin')` (`/claims`) |

## 3. Enforcement Architecture

1. **Server-Side Enforcement**: Permissions are strictly enforced on the server for every incoming request via Express middleware (`requireRole('admin')` in `server/src/middleware/authenticate.js`). Hiding navigation items or action buttons in the frontend is purely for user experience, never a security control.
2. **Real-Time Role Invalidation**: The authentication middleware reads the user's role and status directly from the database on every authenticated request. Any role demotion or account deactivation takes effect immediately without waiting for token expiration.
3. **Data Sanitization**: Staff responses are sanitized at the database/service layer. Fields such as `cost_price`, `stock_value`, and profit calculations are completely excluded from JSON payloads sent to Staff users.
4. **Safety Invariants**:
   - The last active Admin account cannot be deactivated or demoted.
   - An Admin cannot deactivate their own user account.
   - User records cannot be deleted from the database (only deactivated) to maintain historical integrity of sales and audit logs.

## 4. Session & Security Rules

| Parameter | Configuration | Security Objective |
|---|---|---|
| Access Token | Short-lived JWT (15 minutes), held in-memory | Minimizes exposure window if compromised; not stored in `localStorage` |
| Refresh Token | Cryptographically random hash, 8-hour expiration | Stored in `httpOnly`, `Secure`, `SameSite=Strict` cookie bound to auth endpoints |
| Account Lockout | 5 consecutive failed login attempts locks account for 15 minutes | Protects against brute-force attacks |
| Password Policy | 8–128 characters, distinct from username, hashed with Argon2id / bcrypt | Enforces credential entropy |
| First-Time Login | `must_change_password` flag enforced on new/reset users | Mandates password change before accessing protected operations |
