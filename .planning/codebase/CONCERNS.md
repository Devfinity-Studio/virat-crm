---
last_mapped_commit: e275cf5fb6c922764755332ce047fcfbe7f5b6d4
---

# Codebase Concerns

**Analysis Date:** 2026-10-31

## Tech Debt & Architectural Resolutions

### 1. Root Directory Clutter & Script Consolidation (`DEBT-01`)
- **Status:** Resolved in Phase 55.
- **Remediation:** Consolidated all active diagnostic utilities (`check-*.ts`, `db-check.ts`, `sync_db.ts`) into `scripts/`. Removed 22 obsolete Python patch scripts and 19 historical build output logs from project root.

### 2. Mobile Background Geolocation Battery & Permissions (`DEBT-02`)
- **Status:** Resolved in Phase 55.
- **Remediation:** Updated `MOBILE-SPEC.md` for Capacitor React architecture; configured Android 13+ `POST_NOTIFICATIONS` and battery optimization entitlements in `android/app/src/main/AndroidManifest.xml`; hardened `src/hooks/use-location-breadcrumbs.ts` with persistent consent caching.

### 3. Case Sensitivity in Employee Code Authentication
- **Status:** Resolved.
- **Remediation:** Standardized case-insensitive lookups across employee code, email, and username in authentication procedures and routes (`ilike` / lowercase comparison).

### 4. Router Complexity & Procedure Monoliths (`DEBT-03`)
- **Status:** Resolved in Phase 55.
- **Remediation:** Extracted core transaction and business calculations into dedicated domain services:
  - `src/server/lib/services/salesService.ts`: Stock calculations, invoice formatting, and inventory deductions.
  - `src/server/lib/services/userService.ts`: Sequential employee code calculation (`VRT-EMP-XXXX`), password hashing, and manager hierarchy synchronization.

### 5. Dynamic Feature Access Default States (`DEBT-04`)
- **Status:** Resolved in Phase 55.
- **Remediation:** Created `src/server/lib/permissions.ts` with `syncDefaultRolePermissions`, which automatically detects missing `(role, featureKey)` combinations and seeds appropriate default permissions for all roles. Registered in `permissionsRouter.getAll`.

### 6. Codebase, Dependency & Environment Cleanup (`CLEAN-01`..`CLEAN-04`)
- **Status:** Resolved in Phase 56.
- **Remediation:** Purged `.planning_temp/`, `.temp-reports/`, `out/`, and `scratch/` (38 scripts). Removed misplaced schema scripts (`set-password.ts` moved to `scripts/`, `fix-users.ts` deleted). Consolidated root documentation guides into `docs/`. Removed 11 unreferenced packages (`calender`, `dlx`, `tabs`, `@skelon/core`, `tw-animate-css`, `dagre`, `@types/dagre`, `reactflow`, `shadcn`, `twilio`, `resend`) and pruned 338 transitive packages from lockfile. Pruned unused Twilio/Resend environment variables from `src/env.js`, and cleaned dead imports and variables across admin modules.

## Open Concerns & Areas for Care

### 1. Automated E2E Browser Testing
- **Issue:** While 37 automated unit and integration tests exist across 4 test suites (covering pincodes, RBAC, GPS alerts, branch isolation, report scoping, sales calculations, and permission sync), end-to-end browser tests against a live database container are not yet automated in CI.
- **Impact:** Regressions in complex multi-step client workflows (e.g. multi-step order checkout with dynamic line items) could slip past unit tests.
- **Fix approach:** Implement Playwright E2E test suites with a localized test container in future milestones.

### 2. High-Volume Geolocation Telemetry Scalability
- **Issue:** High-frequency breadcrumb streaming from dozens of active mobile field staff populates `breadcrumbs` and `locationLogs` rapidly.
- **Impact:** Over time, unindexed queries on coordinate tables or continuous aggregation of daily mileage could degrade database response times.
- **Mitigation:** Ensure compound indexes on `(userId, timestamp)` and `(branchId, timestamp)` in PostgreSQL, and maintain automated cron aggregation via `/api/cron/mileage`.

### 3. S3 / R2 Direct Upload Link Expiration
- **Issue:** Presigned URLs for file uploads must balance upload window duration against potential link sharing.
- **Current Mitigation:** Presigned URLs expire after 15 minutes and require authenticated caller sessions in `src/server/api/routers/storage.ts`.
- **Recommendation:** Continue monitoring client upload retry behaviors in low-bandwidth rural areas.

### 4. Offline Resiliency on Native Mobile
- **Issue:** Field employees operating in poor network environments may encounter intermittent disconnections while submitting daily reports or sales orders.
- **Current Mitigation:** Form states are cached in component state; service worker caching is supported via `@serwist/next`.
- **Recommendation:** Expand indexedDB offline queue synchronization for sales and report drafts when offline.

## Security Considerations

**Multi-Tenant Branch Isolation:**
- Enforced at procedure level via `enforceBranchIsolation`. Standard employees must never bypass branch boundary restrictions.
- Privileged access is strictly gated to `Admin` and `Developer` roles.

**Password Security:**
- Hashing strictly uses `bcryptjs` with salt round 10 before saving to database. Plaintext passwords must never be logged or stored.

**Session Security:**
- Tokens signed with HS256 JWT via `jose`. Web cookies use `httpOnly: true`, `secure: true`, and `SameSite: Lax`.
- Mobile uses Bearer token authorization header with 30-day token lifetime.
