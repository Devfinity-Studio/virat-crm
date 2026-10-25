# Phase 55 Context: Technical Debt & Architectural Concerns Remediation

## Background & Problem Statement
During initial rapid development and iterative deployments, several architectural risks and technical debt accumulated across the codebase (as documented in `CONCERNS.md`):
1. **Root Directory Clutter (`DEBT-01`)**:
   - The project root contains 22 legacy Python patch scripts (`patch_*.py`), 19 build logs (`build_output*.txt`, `lint*.txt`), and scattered diagnostic scripts (`check-*.ts`, `test-distinct.ts`, `db-check.ts`).
   - Obsolete files create cognitive overhead and confuse team members regarding canonical data migration and utility workflows.
2. **Mobile Background Geolocation & OS Entitlements (`DEBT-02`)**:
   - In `src/hooks/use-location-breadcrumbs.ts`, background geolocation relies on raw prompt calls and Capacitor watcher setups.
   - Android 12+ requires high-priority persistent foreground notifications and location service channels, plus battery optimization exemption guidance, while `MOBILE-SPEC.md` still described an obsolete Flutter stack rather than the active Capacitor architecture.
3. **Router Complexity & Service Layer Extraction (`DEBT-03`)**:
   - Both `src/server/api/routers/sales.ts` (975 lines) and `src/server/api/routers/users.ts` (852 lines) mix database transactions, inventory deductions, employee code generation, and validation logic in inline procedure bodies.
   - Refactoring core calculation, validation, and multi-step transaction routines into dedicated service modules under `src/server/lib/services/` (`salesService.ts`, `userService.ts`) makes domain logic isolated and easily testable.
4. **Dynamic Feature Access Default Synchronization (`DEBT-04`)**:
   - Features registered in `src/app/admin/feature-access/page.tsx` must have default rows in `rolePermissions`. If new features are added without seeding or auto-syncing, `rolePermissions` lookup yields undefined or inconsistent access controls.
   - An auto-sync service routine should ensure every known feature key is seeded with canonical defaults for all default roles.

## Requirements
- `DEBT-01`: Root Directory & Script Cleanup (Consolidate active utilities to `scripts/`, delete obsolete build logs and legacy one-off python patches).
- `DEBT-02`: Mobile Geolocation Entitlements & Battery Hardening (Ensure Capacitor configuration and `MOBILE-SPEC.md` accurately configure foreground service notifications, location permissions, and battery optimization).
- `DEBT-03`: Router Modularization & Service Layer (Extract complex transactions and business logic from `sales.ts` and `users.ts` into `src/server/lib/services/`).
- `DEBT-04`: Dynamic Feature Access Default Synchronization (Implement automatic initialization/sync routine guaranteeing all standard features have default `rolePermissions` records).

## Scope Boundaries
- **In Scope:**
  - Archiving/deleting dead root files, organizing active check scripts into `scripts/`.
  - Updating `MOBILE-SPEC.md` and Capacitor Android configuration/handlers for reliable foreground tracking.
  - Creating `src/server/lib/services/salesService.ts` and `src/server/lib/services/userService.ts`, refactoring routers to call these helpers.
  - Creating `src/server/lib/permissions.ts` with `syncDefaultRolePermissions` and hooking it to server startup or permissions router query fallback.
  - Automated integration tests verifying service operations and permissions sync.
- **Out of Scope:**
  - Modifying user schema or introducing new database migrations unless strictly needed for feature defaults.
  - Full app store deployment (deferred to Phase 53/54).
