# Codebase Concerns & Technical Debt

This document tracks identified architectural risks, technical debt, and improvement areas across the Virat CRM repository.

## 1. Resolved Concerns (Phase 55)

### 1. Root Directory Cleanup & Script Artifacts (`DEBT-01`)
- **Status:** Resolved in Phase 55.
- **Action Taken:** Cleaned project root by consolidating all active diagnostic utilities (`check-*.ts`, `db-check.ts`, `sync_db.ts`) into `scripts/`, and deleting 22 obsolete Python patch scripts and 19 build logs.

### 2. Mobile Background Geolocation Battery & OS Permissions (`DEBT-02`)
- **Status:** Resolved in Phase 55.
- **Action Taken:** Updated `MOBILE-SPEC.md` to reflect Capacitor React architecture, configured Android 13+ `POST_NOTIFICATIONS` and battery optimization entitlements in `AndroidManifest.xml`, and hardened `use-location-breadcrumbs.ts` to cache consent persistently.

### 3. Case Sensitivity in Employee Code Authentication
- **Status:** Resolved. User lookups are strictly case-insensitive across employee codes, emails, and usernames in authentication endpoints.

### 4. Router Complexity & File Size (`DEBT-03`)
- **Status:** Resolved in Phase 55.
- **Action Taken:** Extracted core transaction and business calculations into dedicated service modules:
  - `src/server/lib/services/salesService.ts`: Stock calculations, invoice formatting, and inventory deductions.
  - `src/server/lib/services/userService.ts`: Sequential employee code calculation, password hashing, and manager hierarchy sync.

### 5. Dynamic Feature Access Default States (`DEBT-04`)
- **Status:** Resolved in Phase 55.
- **Action Taken:** Created `src/server/lib/permissions.ts` with `syncDefaultRolePermissions` which automatically detects missing `(role, featureKey)` combinations and seeds appropriate default permissions for all roles. Hooked into `permissionsRouter.getAll`.

## 2. Open / Future Improvement Areas

### 6. Automated E2E Containerized Test Coverage
- **Observation:** While 36 automated unit and integration tests exist (covering pincodes, RBAC, GPS alerts, branch isolation, report scoping, sales calculations, and permission sync), end-to-end browser tests against a live database container in CI can be expanded.
- **Remediation:** Introduce Playwright E2E tests in a future milestone.
