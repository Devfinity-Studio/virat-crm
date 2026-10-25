# Technology Stack

## Core Technologies & Frameworks
- **Runtime & Language:** Node.js (v20+ recommended), TypeScript (Strict mode enabled, ESNext target)
- **Web Framework:** Next.js 15 (App Router architecture with React 19)
- **API & RPC Layer:** tRPC v11 (`@trpc/server`, `@trpc/client`, `@trpc/react-query`) with `@tanstack/react-query` v5
- **OpenAPI Integration:** `trpc-openapi` for REST-compatible API endpoints
- **Styling & Design System:** Tailwind CSS v3, `tailwind-merge`, `clsx`, Radix UI primitives (`@radix-ui/*`), `class-variance-authority`, Lucide React icons (`lucide-react`)
- **UI Components:** Customized `shadcn/ui` component library

## Data & Persistence Layer
- **Database:** PostgreSQL (Neon Serverless PostgreSQL supported)
- **Database Driver:** `postgres` (porsager/postgres driver)
- **ORM:** Drizzle ORM (`drizzle-orm`, `drizzle-kit` for migrations and schema introspection)
- **Connection Mode:** Direct TCP connection or pooled serverless connection string

## Authentication & Security
- **Authentication Mechanism:** Custom session-based JWT tokens using `jose` (HS256 encrypted cookies for web, Bearer tokens for mobile app)
- **Password Hashing:** `bcryptjs` with salt round 10
- **Session Middleware:** Next.js Edge-compatible middleware (`src/middleware.ts`) enforcing protected routes with public legal/auth whitelisting
- **Authorization & Multi-Tenancy:** Custom tRPC middleware pipeline:
  - `isAuthed`: Verifies active session and database user profile
  - `featureProtectedProcedure`: Dynamic feature gate checked against `rolePermissions`
  - `enforceBranchIsolation`: Multi-tenant branch data segregation with Developer/Admin bypass

## Mobile & Geolocation
- **Mobile Runtime:** Capacitor 8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`)
- **Package ID / Namespace:** `com.devfinity.viratcrm`
- **Location Tracking:** `@capacitor-community/background-geolocation`
- **Geospatial & Geofencing:** Turf.js (`@turf/turf`, `@turf/boolean-point-in-polygon`, `@turf/helpers`, `@turf/simplify`)
- **Maps:** Leaflet & React Leaflet (`leaflet`, `react-leaflet`, `@types/leaflet`)
- **Push Notifications:** `@capacitor/push-notifications`, Web Push API

## File Storage & Media
- **Storage Provider:** AWS S3 SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Compatible Targets:** Cloudflare R2 / AWS S3 via presigned PUT and GET URLs

## Tooling & Quality
- **Package Manager:** `pnpm` (Workspace configured with `pnpm-lock.yaml`)
- **Testing Engine:** Vitest (`vitest`)
- **Validation:** Zod v3 (`zod`) across all tRPC schemas, forms, and environment variables (`@t3-oss/env-nextjs`)
- **Forms:** React Hook Form (`react-hook-form`, `@hookform/resolvers`)
- **Linting & Formatting:** ESLint 9 (Flat config `eslint.config.js`), Prettier (`prettier`, `prettier-plugin-tailwindcss`)
