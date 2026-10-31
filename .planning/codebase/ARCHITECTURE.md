---
last_mapped_commit: 8c574802947c74013f90c4768608279f0dee5699
---

# Architecture

**Analysis Date:** 2026-10-31

## Pattern Overview

**Overall:** Type-Safe Modular Monolith with Multi-Tenant Branch Scoping & Capacitor Native Mobile Distribution

**Key Characteristics:**
- **Full-Stack Type Safety:** Unified TypeScript models across database (Drizzle ORM), server RPC (tRPC v11), and client UI (React 19 / TanStack Query).
- **Multi-Tenant Branch Isolation:** Data partitioning where regular employees and branch managers are strictly scoped by `branchId`, while `Developer` and `Admin` roles hold cross-branch governance.
- **Dynamic RBAC & Feature Flags:** Permission matrix managed in the database (`roles` and `rolePermissions` tables) with automated default synchronization and feature gating (`featureProtectedProcedure`).
- **Domain Service Separation:** Core business logic, sequential code generators, and multi-table transaction workflows decoupled into dedicated services under `src/server/lib/services/`.
- **Hybrid Web & Native Client:** Responsive web application running Next.js 15 App Router that simultaneously functions as the core bundle inside Capacitor 8 native shells for Android and iOS.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Clients & Edge Layer                            │
│  - Web Browser (Next.js 15 App Router Client & Server Components)      │
│  - Android / iOS Native Shell (Capacitor WebView @ com.devfinity.viratcrm)│
│  - Edge Middleware (src/middleware.ts): Cookie JWT validation & routing│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP / JSON-RPC
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       tRPC Server & API Layer                          │
│  - Main Router: src/server/api/root.ts                                 │
│  - Context: src/server/api/trpc.ts (Session, User Profile, DB, Cache) │
│  - Middleware Pipeline:                                                │
│      1. isAuthed: Authenticates session token & loads user profile     │
│      2. isManagerMiddleware: Validates manager/leadership authority    │
│      3. featureProtectedProcedure: Checks dynamic role permissions     │
│      4. enforceBranchIsolation: Multi-tenant branch scope validation   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Function Calls
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Domain Services Layer                            │
│  - salesService.ts: Stock calculations, pricing, ledger reconciliation │
│  - userService.ts: Employee code generation, auth, hierarchy sync      │
│  - permissions.ts: Dynamic feature registration & default sync         │
│  - alerts.ts: Low stock & telemetry violation notifications           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ SQL Queries (Drizzle ORM)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Data & Persistence Layer                          │
│  - Drizzle ORM Models: src/server/db/schema/*                          │
│  - PostgreSQL Database: Tables prefixed with `virat-crm_`             │
│  - Cloudflare R2 / AWS S3: Binary documents, images, and attachments   │
└────────────────────────────────────────────────────────────────────────┘
```

## Layers

**1. Presentation & Client Layer (`src/app/`, `src/components/`):**
- Purpose: Render user interfaces, forms, analytical charts, interactive maps, and capture user actions.
- Contains: Next.js pages, client layouts, shadcn/ui components (`src/components/ui/`), and feature-specific components (`src/app/_components/`).
- Depends on: tRPC React client (`@/trpc/react`), TanStack Query, and browser/Capacitor native APIs.
- Used by: End users via browser and mobile applications.

**2. Routing & Edge Middleware Layer (`src/middleware.ts`, `src/app/api/`):**
- Purpose: Fast route interception, authentication verification, REST endpoints, and tRPC request handling.
- Contains: Edge JWT verification, route protection rules, file download/export endpoints, cron handlers (`/api/cron/mileage`), and `/api/trpc/[trpc]`.
- Depends on: `jose` JWT verification, `src/env.js`.
- Used by: Incoming HTTP requests prior to page or API execution.

**3. API & Procedure Layer (`src/server/api/`):**
- Purpose: Expose type-safe RPC procedures with standardized authentication, authorization, and branch isolation.
- Contains: Root router (`root.ts`), 21 domain routers (`routers/*.ts`), and procedure definitions (`trpc.ts`).
- Depends on: Domain services (`src/server/lib/services/*`), Drizzle database client (`src/server/db/`), Zod input schemas.
- Used by: Client application via `@/trpc/react`.

**4. Domain Services Layer (`src/server/lib/services/`, `src/server/lib/`):**
- Purpose: Encapsulate complex business rules, multi-table transactions, and calculation algorithms outside of HTTP handlers.
- Contains:
  - `salesService.ts`: Stock balance validation, quantity deduction, price calculations, and invoice numbering.
  - `userService.ts`: Sequential employee code generation (`VRT-EMP-XXXX`), password hashing, and manager assignments.
  - `permissions.ts`: System feature registration (`SYSTEM_FEATURES`), default permission matrices, and automatic synchronization.
  - `alerts.ts` & `push.ts`: System broadcast notifications and threshold alert generation.
- Depends on: Drizzle database client and schema definitions.
- Used by: tRPC routers and automated scripts.

**5. Persistence Layer (`src/server/db/`):**
- Purpose: Manage relational data schemas, relations, migrations, and database connection pooling.
- Contains: Table definitions (`src/server/db/schema/*`), relational mappings, database client instance (`index.ts`).
- Depends on: `postgres` driver and `drizzle-orm`.
- Used by: Domain services and tRPC procedures.

## Data Flow

### Primary Request Lifecycle (e.g., Submitting a Sale Order):
1. **User Action:** Employee fills the sale order form in `src/app/sales/new/page.tsx` and submits.
2. **tRPC Invocation:** Client triggers `api.sales.createSale.useMutation(...)`.
3. **Context Initialization:** `createTRPCContext` extracts the token from HTTP cookie or `Authorization: Bearer` header, queries the user profile from PostgreSQL, and loads system settings.
4. **Middleware Execution:**
   - `isAuthed`: Confirms active user session and not suspended.
   - `featureProtectedProcedure("sales")`: Verifies role has permission for feature `"sales"`.
   - `enforceBranchIsolation`: Confirms the target branch matches the user's assigned branch (or user is Admin/Developer).
5. **Service Execution:** `salesService.validateAndProcessSale` verifies stock availability, computes net balances, creates the sale record, inserts line items, updates customer balance, and creates inventory transactions inside a PostgreSQL transaction (`ctx.db.transaction`).
6. **Response & Cache Sync:** Returns typed invoice record; client invalidates React Query cache keys (`api.sales.getSales.invalidate()`, `api.inventory.invalidate()`).

### Mobile Telemetry & Location Breadcrumbs Lifecycle:
1. **Background Tracker:** Capacitor background geolocation plugin wakes up periodically on employee device.
2. **Telemetry Submission:** Calls `api.location.recordBreadcrumb` with coordinates, speed, and accuracy.
3. **Distance Calculation:** Server uses Turf.js to compute segment distance from previous point and increments `dailyMileage`.
4. **Live Map Display:** Managers observe employee paths and current locations in `src/app/admin/live-map/page.tsx`.

## Key Abstractions

**Multi-Tenancy Scoping (`enforceBranchIsolation`):**
- Location: `src/server/api/trpc.ts`
- Purpose: Ensures data isolation across different branches. Throws `FORBIDDEN` if a user attempts to read or mutate records outside their assigned branch, while allowing unrestricted access to `Developer` and `Admin` users.

**Dynamic Feature Gate (`featureProtectedProcedure` & `<FeatureGate>`):**
- Location: Server `src/server/api/trpc.ts`, Client `src/app/_components/auth/FeatureGate.tsx`
- Purpose: Dynamically restricts access to specific functional areas based on the `rolePermissions` table in the database.

**Service Encapsulation (`salesService`, `userService`):**
- Location: `src/server/lib/services/`
- Purpose: Houses reusable business calculations and transaction workflows, keeping routers clean and testable.

**System Governance (`systemSettings`):**
- Location: `src/server/db/schema/systemSettings.ts`
- Purpose: Global control flags (`isReadOnly`, `isSystemLocked`, `maxUsers`, `disabledFeaturesGlobal`) allowing runtime maintenance without code redeployment.

## Entry Points

**Web Application:**
- `src/app/layout.tsx`: Root HTML layout wrapping the app with `TRPCReactProvider` and toast containers.
- `src/app/page.tsx`: Root page routing users to dashboard or `/login`.
- `src/middleware.ts`: Next.js Edge middleware intercepting all incoming HTTP requests for authentication validation.

**API & RPC:**
- `src/app/api/trpc/[trpc]/route.ts`: tRPC HTTP handler routing RPC requests to `src/server/api/root.ts`.
- `src/app/api/auth/login/route.ts` & `src/app/api/auth/logout/route.ts`: HTTP session authentication routes.
- `src/app/api/monitoring/check/route.ts`: Infrastructure health check.

**Mobile Shell:**
- `capacitor.config.ts`: Native entry bridge specifying web deployment target and plugins.
- `android/app/src/main/AndroidManifest.xml`: Android application manifest configuring background location and push permissions.

## Error Handling

**Strategy:**
- tRPC procedures throw standard `TRPCError` with semantic codes (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`).
- Client mutations utilize `onError` callbacks displaying user-friendly error toasts via `sonner`.
- Form inputs validate client-side with Zod resolvers via `react-hook-form` before network requests are dispatched.
- Database transactions automatically roll back on uncaught errors within `ctx.db.transaction`.
