---
last_mapped_commit: 8c574802947c74013f90c4768608279f0dee5699
---

# Codebase Structure

**Analysis Date:** 2026-10-31

## Directory Layout

```
virat-crm/
├── .planning/                  # Project planning, roadmap, state, and codebase documentation
│   ├── codebase/              # Structured codebase intelligence documents (7 files)
│   ├── milestones/            # Milestone completion summaries and archives
│   ├── phases/                # Phase execution plans, specifications, and test reports
│   ├── PROJECT.md             # Core project mission, architecture, and principles
│   ├── REQUIREMENTS.md        # Feature requirements matrix and status
│   ├── ROADMAP.md             # Milestone roadmap and phase progression
│   └── STATE.md               # Current project status and active focus
├── android/                   # Native Android application wrapper (Capacitor)
│   ├── app/                   # Android Gradle module (build.gradle, AndroidManifest.xml)
│   └── build.gradle           # Root Android Gradle build script
├── ios/                       # Native iOS application wrapper (Capacitor Xcode project)
│   └── App/                   # iOS Xcode workspace, project files, and native assets
├── drizzle/                   # Drizzle ORM migration scripts and schema snapshots
├── public/                    # Static assets, logos, icons, PWA manifests, leaflet markers
├── scripts/                   # System administrative utilities, data generators, and seeds
│   ├── check-permissions.ts   # Verifies role permissions in database
│   ├── check-settings.ts      # Checks system settings singleton
│   ├── check-users.ts         # Diagnostic script for user credentials
│   ├── db-check.ts            # Database connection and table verification
│   ├── generate-daily-reports.ts # Generates test activity reports
│   ├── generate-fake-sales.ts # Generates test sales records
│   ├── generate-sample-reports.ts # Populates sample data
│   ├── sync_db.ts             # Database synchronization script
│   └── test-distinct.ts       # Query testing utility
├── src/
│   ├── app/                   # Next.js 15 App Router pages and route handlers
│   │   ├── _components/       # Feature-specific reusable React UI components
│   │   │   ├── auth/          # FeatureGate, permission shields
│   │   │   ├── crm/           # Customer management forms & ledger tables
│   │   │   ├── dashboard/     # Metric cards, charts, and activity feeds
│   │   │   ├── layout/        # Sidebar, header, navigation shell
│   │   │   ├── maps/          # Leaflet map components & GPS markers
│   │   │   ├── notifications/ # Notification center & push dialogs
│   │   │   ├── reports/       # Daily report submission & mileage views
│   │   │   ├── ui/            # Extended specialized UI widgets
│   │   │   └── workforce/     # Attendance, leave approvals, org tree
│   │   ├── admin/             # System administrative control panel
│   │   │   ├── developer/     # Developer debug panel & settings management
│   │   │   ├── exports/       # Data export tools (Excel, CSV)
│   │   │   ├── feature-access/# Dynamic role-permission matrix configuration
│   │   │   ├── imports/       # Bulk data import utilities
│   │   │   ├── live-map/      # Real-time field workforce map view
│   │   │   ├── manage/        # Branch and warehouse management
│   │   │   ├── org-chart/     # Interactive hierarchy graph
│   │   │   ├── reports/       # Consolidated administrative analytics
│   │   │   └── users/         # Employee CRUD, credentials, document verification
│   │   ├── advances/          # Sales advance payments and adjustments
│   │   ├── api/               # Next.js HTTP Route Handlers
│   │   │   ├── auth/          # Login, logout, session refresh routes
│   │   │   ├── cron/          # Scheduled background cron endpoints (mileage)
│   │   │   ├── export/        # Data export stream routes
│   │   │   ├── import/        # Bulk product and data import endpoints
│   │   │   ├── monitoring/    # System health check route (`/api/monitoring/check`)
│   │   │   ├── rest/          # OpenAPI REST gateway
│   │   │   └── trpc/          # tRPC HTTP handler (`/api/trpc/[trpc]`)
│   │   ├── attendance/        # Employee attendance check-in/out and geofencing
│   │   ├── cookie-policy/     # Public cookie policy page
│   │   ├── crm/               # Customer master and balance ledger pages
│   │   ├── data-deletion/     # Public data deletion request page
│   │   ├── documents/         # Document verification and upload portal
│   │   ├── inventory/         # Stock levels, transfers, catalog management
│   │   ├── login/             # Workplace sign-in page with branch selection
│   │   ├── privacy-policy/    # Public legal page (App store compliant)
│   │   ├── profile/           # User profile and account settings
│   │   ├── replacements/      # Damage and return claims processing
│   │   ├── reports/           # Daily activity reports & PDF export templates
│   │   ├── sales/             # Orders, invoices, transaction receipts
│   │   ├── signup/            # Self-service employee signup page
│   │   ├── terms-of-service/  # Public terms of service
│   │   ├── layout.tsx         # Root app layout with providers (TRPC, Toaster)
│   │   └── page.tsx           # Dashboard landing / redirect route
│   ├── components/            # Shared UI components (shadcn/ui primitives)
│   │   └── ui/                # button, input, dialog, table, select, card, etc.
│   ├── hooks/                 # Custom React hooks (location, media queries, debounce)
│   ├── lib/                   # Shared client/server utility functions
│   │   └── utils.ts           # Class merge (`cn`) and formatting helpers
│   ├── server/                # Backend Server Architecture
│   │   ├── api/               # tRPC API Layer
│   │   │   ├── routers/       # Feature-specific router controllers (21 routers)
│   │   │   ├── root.ts        # AppRouter definition merging all sub-routers
│   │   │   └── trpc.ts        # Procedure creators & isolation middlewares
│   │   ├── db/                # Persistence & Data Access
│   │   │   ├── schema/        # Drizzle ORM schema modules (25+ tables)
│   │   │   ├── index.ts       # Database client initialization
│   │   │   └── seed.ts        # Database seed runner
│   │   └── lib/               # Server-side business logic & services
│   │       ├── services/      # Domain service modules
│   │       │   ├── salesService.ts # Stock, invoice, and ledger business logic
│   │       │   └── userService.ts  # Employee code sequencing, credentials, hierarchy
│   │       ├── alerts.ts      # Low stock and operational notifications
│   │       ├── auth.ts        # JWT session cookie/token creation and verification
│   │       ├── communication.ts # Twilio SMS & Resend email dispatch
│   │       ├── permissions.ts # Feature matrix & auto-sync defaults
│   │       ├── push.ts        # Web Push notification dispatcher
│   │       └── r2.ts          # S3/R2 client and presigned URL generator
│   ├── styles/                # Global CSS and Tailwind definitions
│   ├── trpc/                  # Client-side tRPC React Query bindings (`api`)
│   ├── env.js                 # Environment variable schema and validation
│   └── middleware.ts          # Edge authentication and route protection middleware
├── tests/                     # Unit and integration test suites
│   ├── integration/           # Multi-tenant and branch isolation integration tests
│   │   ├── multi-tenant.test.ts # Branch boundary security tests
│   │   ├── report-scoping.test.ts # Role-based report scoping & hierarchy tests
│   │   └── services.test.ts   # Domain services unit & integration tests
│   └── validation.test.ts     # Pincode, RBAC, and Zod schema tests
├── capacitor.config.ts        # Native Capacitor mobile shell configuration
├── components.json            # shadcn/ui configuration
├── drizzle.config.ts          # Drizzle Kit migration configuration
├── eslint.config.js           # ESLint 9 configuration
├── next.config.js             # Next.js build configuration
├── package.json               # Package dependencies and npm scripts
├── tsconfig.json              # TypeScript compiler configuration
└── vitest.config.ts           # Vitest configuration
```

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root Next.js layout configuring providers and fonts
- `src/app/page.tsx`: Landing router redirecting authenticated users to dashboard or `/login`
- `src/middleware.ts`: Edge authentication middleware validating session cookies
- `src/app/api/trpc/[trpc]/route.ts`: Central HTTP handler for tRPC calls
- `capacitor.config.ts`: Native mobile client bridge definition

**Configuration:**
- `src/env.js`: Environment variables schema and runtime validation
- `tsconfig.json`: TypeScript compiler options (`strict: true`)
- `next.config.js`: Next.js bundler settings
- `drizzle.config.ts`: Database connection and schema path definitions
- `vitest.config.ts`: Test suite runner settings

**Core Logic & Services:**
- `src/server/lib/services/salesService.ts`: Stock calculations, invoice formatting, and inventory deductions
- `src/server/lib/services/userService.ts`: Sequential employee code calculation, password hashing, and manager hierarchy sync
- `src/server/lib/permissions.ts`: System features list and role permission default sync
- `src/server/api/trpc.ts`: Context creation, authentication, branch isolation middlewares
- `src/server/api/root.ts`: Root tRPC AppRouter assembling all 21 routers

**Database Models (`src/server/db/schema/`):**
- `users.ts`: Employee profiles, roles, branch assignments, credentials
- `sales.ts`, `saleItems.ts`: Sales orders and itemized records
- `inventory.ts`, `inventoryTransactions.ts`, `stockTransfers.ts`: Warehousing and stock tracking
- `customers.ts`: Customer directory and balances
- `breadcrumbs.ts`, `daily_mileage.ts`, `locationLogs.ts`: Field workforce telemetry
- `rolePermissions.ts`, `roles.ts`: Dynamic RBAC permissions
- `systemSettings.ts`: Singleton system flags and maintenance toggles

**Testing:**
- `tests/integration/services.test.ts`: Service layer logic tests (sales, users, permissions)
- `tests/integration/multi-tenant.test.ts`: Branch isolation security boundary tests
- `tests/integration/report-scoping.test.ts`: Role-based hierarchy report scoping tests
- `tests/validation.test.ts`: Regex, RBAC simulation, and Zod validation tests

## Naming Conventions

**Files:**
- React Components & Pages: PascalCase for standalone components (`AddUserForm.tsx`, `FeatureGate.tsx`); Next.js conventions for route handlers (`page.tsx`, `layout.tsx`, `route.ts`).
- Router Modules: camelCase (`sales.ts`, `dailyReports.ts`, `fieldSupport.ts`).
- Service Modules: camelCase with `Service` suffix (`salesService.ts`, `userService.ts`).
- Schema Modules: camelCase (`users.ts`, `rolePermissions.ts`, `inventoryTransactions.ts`).
- Test Files: `*.test.ts` placed within `tests/` or `tests/integration/`.

**Directories:**
- Feature directories in `src/app/` use kebab-case (`live-map`, `field-support`, `feature-access`).
- Sub-components grouped under `_components/` with feature-based grouping (`_components/crm`, `_components/sales`).

## Where to Add New Code

**New tRPC Router / API Endpoint:**
1. Create router in `src/server/api/routers/<feature>.ts`.
2. Register in `src/server/api/root.ts` within `appRouter`.
3. If new feature key is introduced, add to `SYSTEM_FEATURES` in `src/server/lib/permissions.ts`.

**New Database Entity:**
1. Create table schema in `src/server/db/schema/<entity>.ts` with table prefix `virat-crm_`.
2. Export table and relations in `src/server/db/schema/index.ts`.
3. Run `pnpm db:generate` to generate migration file.

**New Business / Domain Logic:**
1. Create or update domain service under `src/server/lib/services/`.
2. Add corresponding unit or integration test in `tests/integration/services.test.ts`.

**New Frontend Page / View:**
1. Add route in `src/app/<route>/page.tsx`.
2. Create dedicated sub-components in `src/app/_components/<route>/`.
3. Wrap protected features with `<FeatureGate featureKey="...">`.
