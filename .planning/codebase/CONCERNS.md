# Codebase Concerns & Technical Debt

This document tracks identified architectural risks, technical debt, and improvement areas across the Virat CRM repository.

## 1. High Priority Concerns

### 1. Root Directory Cleanup & Script Artifacts
- **Observation:** The root project directory contains over 20 legacy patch scripts (`patch_*.py`), database check utilities (`check-users.ts`, `db-check.ts`), and multiple `build_output*.txt` logs.
- **Risk:** Clutters repository navigation, creates confusion about the canonical way to apply migrations or fixes, and risks accidental execution of outdated patches.
- **Remediation:** Consolidate active utility scripts into the `scripts/` directory and remove obsolete build logs and one-off Python patch files.

### 2. Mobile Background Geolocation Battery & OS Permissions
- **Observation:** The mobile application relies on `@capacitor-community/background-geolocation` for streaming employee breadcrumbs.
- **Risk:** Modern Android (Android 12+) and iOS versions aggressively terminate background geolocation tasks unless foreground service notifications, precise location permissions, and battery optimization exemptions are properly configured.
- **Remediation:** Ensure Android foreground notification channel and iOS `location-always` entitlements are clearly documented in `MOBILE-SPEC.md` and validated on physical test devices.

### 3. Case Sensitivity in Employee Code Authentication
- **Observation:** In earlier iterations, `src/server/api/routers/auth.ts` uppercased employee codes while `/api/auth/login` performed exact string matching, causing login failures when users entered lowercase codes (e.g. `emp001` vs `EMP001`).
- **Status:** Resolved in recent updates by making user lookups case-insensitive across employee codes, emails, and usernames. Ensure all future authentication endpoints adhere to this standard.

## 2. Moderate Priority Concerns

### 4. Router Complexity & File Size
- **Observation:** Several tRPC routers in `src/server/api/routers/` (such as `sales.ts` at 980+ lines and `users.ts` at 850+ lines) encapsulate substantial domain logic directly inside procedure mutations.
- **Risk:** Increases cognitive overhead and makes unit testing individual business rules difficult.
- **Remediation:** Extract complex business operations (such as inventory stock adjustment calculations and report aggregation) into dedicated service layer helpers under `src/server/lib/services/`.

### 5. Automated Test Coverage
- **Observation:** While unit tests exist for postal pincodes and multi-tenant isolation, automated end-to-end (E2E) and procedure integration test coverage is currently limited.
- **Remediation:** Establish automated testing against an in-memory or Dockerized PostgreSQL container to validate critical sales and inventory transaction flows in CI.

### 6. Dynamic Feature Access Default States
- **Observation:** When new features or permissions are introduced to `src/app/admin/feature-access/page.tsx`, corresponding rows must be seeded in the `rolePermissions` table.
- **Remediation:** Implement an automatic synchronization mechanism during server initialization or database migrations that inserts missing permission rows with default values.
