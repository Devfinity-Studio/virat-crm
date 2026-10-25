# System Architecture

Virat CRM is an enterprise-grade ERP and field workforce management system engineered using Next.js 15 App Router, tRPC, PostgreSQL, and Drizzle ORM, with native mobile distribution via Capacitor.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Clients & Edge Layer                            │
│  - Web Browser (Next.js 15 App Router Client Components)               │
│  - Android / iOS Native Shell (Capacitor WebView @ com.devfinity.crm) │
│  - Edge Middleware (src/middleware.ts): Cookie JWT validation & routing│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP / JSON-RPC
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       tRPC Server & API Layer                          │
│  - Router: src/server/api/root.ts                                      │
│  - Context: Session extraction, DB connection, System Settings cache   │
│  - Middleware Pipeline:                                                │
│      1. isAuthed: Authenticates session token & loads user profile     │
│      2. isManagerMiddleware: Validates manager / leadership status     │
│      3. featureProtectedProcedure: Checks dynamic role permissions     │
│      4. enforceBranchIsolation: Multi-tenant branch scope validation   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ SQL Queries
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Data & Persistence Layer                          │
│  - Drizzle ORM Models (src/server/db/schema/*)                         │
│  - PostgreSQL Database (Tables prefixed with `virat-crm_`)             │
│  - S3 / Cloudflare R2 Object Storage (Documents, photos, receipts)     │
└────────────────────────────────────────────────────────────────────────┘
```

## 1. Architectural Patterns & Principles

### Multi-Tenancy & Branch Isolation
- All operations (inventory, sales, daily reports, workforce logs, customers) are scoped by `branchId`.
- **Enforcement:** The `enforceBranchIsolation(ctx, targetBranchId)` utility ensures that standard users and managers can only read/write data within their designated branch.
- **Privileged Access:** Users with the `Developer` or `Admin` role bypass branch isolation, granting them cross-branch visibility and multi-branch management capabilities. On web login, Admins are prompted to select an active working branch session.

### Role-Based Access Control (RBAC) & Dynamic Feature Gating
- The system employs dynamic database-backed permissions (`roles` and `rolePermissions` tables).
- System Roles include:
  - `Developer`: Sovereign system role that bypasses all feature gates and branch isolation.
  - `Admin`: Full managerial and administrative authority across all CRM modules.
  - `Manager`: Branch-level operational authority over reporting field staff, order approval, and local inventory.
  - `Employee`: Field-level operational role restricted to customer visits, sales submission, daily reports, and personal attendance.
- Granular Feature Keys: `dashboard`, `sales`, `crm`, `reports`, `workforce`, `field-support`, `live-map`, `analytics`, `documents`, `org-chart`, `inventory`, `admin`, `replacements`, `performance`.
- Feature access is enforced both on the server via `featureProtectedProcedure(featureKey)` and on the client via `<FeatureGate featureKey="...">`.

### Organizational Reporting Hierarchy
- The `userManagers` join table models a many-to-many manager-employee hierarchy.
- Managers can review subordinate daily reports, approve or reject sales orders and replacement requests, and monitor field staff movement on the live field map.

### Field Workforce Telemetry & Geolocation
- Mobile devices stream periodic coordinates to `api.location.recordBreadcrumb`.
- The system computes:
  - Route histories and stop points stored in `breadcrumbs`.
  - Daily cumulative distance in `dailyMileage` using Turf.js distance algorithms.
  - Geofenced attendance verification against branch coordinates and allowed radius.

### System Safety & Maintenance Mode
- The `systemSettings` table (singleton ID `"global"`) enables runtime governance:
  - `maxUsers`: Enforces maximum active employee count based on license tiers.
  - `isSystemLocked` / `isReadOnly`: Global maintenance switch that blocks state-mutating transactions without downtime.
  - `disabledFeaturesGlobal`: Instant kill-switch for individual features if maintenance is required.

## 2. Data Flow Lifecycle

1. **Client Action:** User triggers an action via React UI or mobile screen (e.g., submitting a sale in `src/app/sales/new/page.tsx`).
2. **tRPC Invocation:** Client calls `api.sales.createSale.useMutation(...)`.
3. **Context Initialization:** `createTRPCContext` extracts the JWT session from cookies (web) or `Authorization: Bearer` header (mobile), queries the user from PostgreSQL, and loads system settings.
4. **Middleware Execution:**
   - Validates that the user is authenticated (`isAuthed`).
   - Ensures the feature (`"sales"`) is enabled for the user's role (`featureProtectedProcedure`).
   - Validates branch boundaries via `enforceBranchIsolation`.
5. **Procedure Logic:** The router handler executes within a transactional block using Drizzle ORM (`ctx.db.transaction`), updating customer balance, inventory quantities, and creating the sale record with order items.
6. **Response:** Typed JSON response is sent back to the client, invalidating relevant React Query cache keys.
