# System Architecture

Virat CRM is built on the T3 Stack, leveraging Next.js App Router for full-stack React capabilities.

## High-Level Design
- **Client Layer**: React components using Tailwind CSS and shadcn/ui. State management is handled primarily via TRPC React Query bindings.
- **API Layer**: TRPC procedures defined in `src/server/api/routers`. This provides end-to-end typesafe APIs without the need for manual schema syncing.
- **Database Layer**: Drizzle ORM managing a PostgreSQL database. Schema definitions are split into domain-specific files under `src/server/db/schema`.

## Core Domains
1. **Users & Auth** (`users.ts`, `roles.ts`, `rolePermissions.ts`): Handles authentication, hierarchy, and permissions.
2. **Sales & Inventory** (`sales.ts`, `inventory.ts`, `products.ts`, `replacements.ts`): Tracks products, stock transfers, and field sales.
3. **Field Operations** (`customer_visits.ts`, `daily_mileage.ts`, `locationLogs.ts`, `daily_reports.ts`): Tracks on-ground employee activities and geographic data.

## Directory Structure
- `src/app`: Next.js application routes (e.g., `/admin`, `/sales`, `/inventory`).
- `src/components`: Shared React UI components.
- `src/server/api`: TRPC root and domain-specific routers.
- `src/server/db/schema`: Database tables and relations using Drizzle ORM.
