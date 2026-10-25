# Phase 55 Plan: Technical Debt & Architectural Concerns Remediation

## Executive Summary
This phase addresses the architectural risks and technical debt identified in `CONCERNS.md`. It achieves clean repository hygiene, aligns mobile background geolocation specs and foreground notification configs for Capacitor Android, extracts complex transaction logic into modular backend services under `src/server/lib/services/`, and establishes automated default permission synchronization for system features.

---

## Plan Details

### Wave 1: Repository Hygiene & Mobile Hardening

#### Task 1: Clean Root Directory & Consolidate Utilities (`DEBT-01`)
- **Target Files:**
  - Root directory (`patch_*.py`, `build_output*.txt`, `lint*.txt`, `check-*.ts`, `test-distinct.ts`, `db-check.ts`)
  - `scripts/` directory
- **Action:**
  - Move reusable diagnostic/utility scripts (`check-permissions.ts`, `check-settings.ts`, `check-users.ts`, `db-check.ts`, `test-distinct.ts`, `sync_db.ts`) into `scripts/`.
  - Remove obsolete build output logs (`build_output*.txt`, `lint*.txt`, `lint_output.txt`).
  - Remove legacy one-off root Python patch scripts (`patch_*.py`) that have already been integrated into code migrations.
  - Update any npm/pnpm script references if necessary.
- **Verification:**
  - `ls` of root directory contains only standard configuration files (`package.json`, `tsconfig.json`, `next.config.js`, `capacitor.config.ts`, etc.) and canonical docs.

#### Task 2: Mobile Geolocation Entitlements & Battery Hardening (`DEBT-02`)
- **Target Files:**
  - `MOBILE-SPEC.md`
  - `src/hooks/use-location-breadcrumbs.ts`
  - `android/app/src/main/AndroidManifest.xml`
- **Action:**
  - Rewrite `MOBILE-SPEC.md` to reflect the production Capacitor React architecture rather than legacy Flutter text. Document Android 12+ foreground service notification channels, fine/coarse/background location permissions, and manufacturer battery optimization guidelines (e.g., "Don't kill my app").
  - Audit `use-location-breadcrumbs.ts` to ensure Capacitor background notification options (title, text, icon) and watcher lifecycle cleanly handle background operation without blocking alerts.
- **Verification:**
  - `MOBILE-SPEC.md` is updated and matches actual Capacitor architecture.
  - Location breadcrumbs hook cleanly initializes with valid foreground notification parameters.

---

### Wave 2: Service Layer Extraction & Feature Permissions Sync

#### Task 3: Extract Sales Service Layer (`DEBT-03`)
- **Target Files:**
  - `src/server/lib/services/salesService.ts` (New)
  - `src/server/api/routers/sales.ts`
- **Action:**
  - Create `src/server/lib/services/salesService.ts`.
  - Extract multi-step calculations:
    - Sales balance and ledger entry calculations.
    - Product stock quantity validation and inventory deduction logic.
    - Transaction wrapper operations for order creation and updates.
  - Refactor `src/server/api/routers/sales.ts` mutations to delegate business rules and data calculations to `salesService.ts`.
- **Verification:**
  - `src/server/api/routers/sales.ts` line count reduced significantly and mutations become clean tRPC input-validation + service invocation wrappers.

#### Task 4: Extract User Management Service Layer (`DEBT-03`)
- **Target Files:**
  - `src/server/lib/services/userService.ts` (New)
  - `src/server/api/routers/users.ts`
- **Action:**
  - Create `src/server/lib/services/userService.ts`.
  - Extract:
    - Automated sequential employee code generator (`generateNextEmployeeCode`).
    - Password hashing and initial credential generation.
    - Manager hierarchy M:N relationship synchronization (`virat-crm_user_managers`).
  - Refactor `src/server/api/routers/users.ts` to delegate user creation, code generation, and hierarchy linking to `userService.ts`.
- **Verification:**
  - `src/server/api/routers/users.ts` code generation and relationship management logic cleanly delegated.

#### Task 5: Dynamic Feature Access Default Synchronization (`DEBT-04`)
- **Target Files:**
  - `src/server/lib/permissions.ts` (New)
  - `src/server/api/routers/permissions.ts`
- **Action:**
  - Define canonical list of system features (`features` enum or constants) with default enabled/disabled status per role (`Developer`, `Admin`, `Manager`, `Employee`).
  - Create `syncDefaultRolePermissions(db)` in `src/server/lib/permissions.ts`.
  - In `permissionsRouter.getAll`, automatically invoke `syncDefaultRolePermissions` or ensure missing rows are populated before returning permissions list to frontend feature gates.
- **Verification:**
  - Querying `permissions.getAll` automatically creates missing permission rows with their standard default flags for any newly added features.

---

### Wave 3: Testing & Verification Loop

#### Task 6: Automated Integration Tests (`DEBT-03`, `DEBT-04`)
- **Target Files:**
  - `tests/integration/services.test.ts` (New)
- **Action:**
  - Write Vitest tests verifying:
    - `salesService` calculations and stock updates.
    - `userService` employee code generation and hierarchy syncing.
    - `syncDefaultRolePermissions` inserts missing feature entries with correct defaults.
- **Verification:**
  - `npx vitest run tests/integration/services.test.ts` passes with 100% success.

#### Task 7: Full Test Suite & Roadmap Synchronization
- **Action:**
  - Run full test suite: `npx vitest run`.
  - Update `CONCERNS.md` reflecting completed remediations.
  - Create `55-SUMMARY.md`.
  - Update `ROADMAP.md` and `REQUIREMENTS.md` traceability.
  - Commit and push to git.

---

## Verification Criteria
1. Root directory is clean of legacy `patch_*.py` and `build_output*.txt` files.
2. `salesService.ts` and `userService.ts` handle core transactions and pass automated unit/integration tests.
3. Feature permissions auto-sync reliably seeds missing permissions for all roles.
4. Vitest test suite passes 100%.
