# Project Directory Structure

```
virat-crm/
├── .planning/                  # Project roadmap, specs, audits, and codebase docs
│   ├── codebase/              # Structured codebase intelligence documents (7 files)
│   ├── milestones/            # Milestone completion artifacts
│   ├── phases/                # Phase execution plans and verification summaries
│   └── PROJECT.md             # Project vision, guidelines, and core requirements
├── android/                   # Native Android application wrapper (Capacitor)
│   ├── app/                   # Android Gradle module (build.gradle, manifest, resources)
│   └── build.gradle           # Root Gradle configuration
├── ios/                       # Native iOS application wrapper (Capacitor Xcode project)
│   └── App/                   # Xcode project files and native assets
├── drizzle/                   # Drizzle ORM migration scripts & schema snapshots
├── public/                    # Static assets, branding logos, icons, PWA manifests
├── scripts/                   # System automation, administrative scripts, and seeds
│   ├── generate-daily-reports.ts
│   ├── generate-fake-sales.ts
│   └── generate-sample-reports.ts
├── src/
│   ├── app/                   # Next.js 15 App Router
│   │   ├── _components/       # Feature-specific reusable UI modules
│   │   │   ├── auth/          # FeatureGate, permission shields
│   │   │   ├── crm/           # Customer management forms & ledger tables
│   │   │   ├── dashboard/     # Metric cards, charts, and activity feeds
│   │   │   ├── layout/        # Sidebar, header, navigation shell
│   │   │   ├── reports/       # Daily report submission & mileage views
│   │   │   ├── sales/         # Order creation dialogs & sales tables
│   │   │   └── workforce/     # Attendance, leave approvals, org tree
│   │   ├── admin/             # System administrative control panel
│   │   │   ├── developer/     # Developer debug panel & settings management
│   │   │   ├── exports/       # Data export tools
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
│   │   │   ├── rest/          # OpenAPI REST gateway
│   │   │   └── trpc/          # tRPC HTTP handler (`/api/trpc/[trpc]`)
│   │   ├── crm/               # Customer master and balance ledger pages
│   │   ├── inventory/         # Stock levels, transfers, catalog management
│   │   ├── login/             # Workplace sign-in page with branch selection
│   │   ├── privacy-policy/    # Public legal page (App store compliant)
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
│   │   │   │   ├── alerts.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── crm.ts
│   │   │   │   ├── dailyReports.ts
│   │   │   │   ├── developer.ts
│   │   │   │   ├── fieldSupport.ts
│   │   │   │   ├── heartbeat.ts
│   │   │   │   ├── hierarchy.ts
│   │   │   │   ├── inventory.ts
│   │   │   │   ├── leaves.ts
│   │   │   │   ├── location.ts
│   │   │   │   ├── maintenance.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   ├── replacements.ts
│   │   │   │   ├── reports.ts
│   │   │   │   ├── roles.ts
│   │   │   │   ├── sales.ts
│   │   │   │   ├── storage.ts
│   │   │   │   └── users.ts
│   │   │   ├── root.ts        # AppRouter definition merging all sub-routers
│   │   │   └── trpc.ts        # Procedure creators & isolation middlewares
│   │   ├── db/                # Persistence & Data Access
│   │   │   ├── schema/        # Drizzle ORM schema modules (25+ tables)
│   │   │   ├── index.ts       # Database client initialization
│   │   │   └── seed.ts        # Database seed runner
│   │   └── lib/               # Server-side business logic & utilities
│   │       ├── alerts.ts      # Low stock and operational notifications
│   │       └── auth.ts        # JWT session cookie/token creation and verification
│   ├── styles/                # Global CSS and Tailwind definitions
│   ├── trpc/                  # Client-side tRPC React Query bindings (`api`)
│   └── middleware.ts          # Edge authentication and route protection middleware
├── tests/                     # Unit and integration test suites
│   ├── integration/           # Multi-tenant and branch isolation integration tests
│   └── validation.test.ts     # Pincode, RBAC, and Zod schema tests
├── capacitor.config.ts        # Native Capacitor configuration
├── drizzle.config.ts          # Drizzle Kit migration configuration
├── next.config.js             # Next.js configuration
├── package.json               # Dependencies and build scripts
└── tsconfig.json              # Strict TypeScript compiler options
```
