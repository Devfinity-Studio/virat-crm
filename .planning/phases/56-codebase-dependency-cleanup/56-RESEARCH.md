# Phase 56: Codebase, Directory & Dependency Cleanup - Research

**Researched:** 2026-10-31
**Domain:** Repository hygiene, unused dependency removal, environment variable auditing, dead code pruning
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Full Clean):** Delete temporary and obsolete directories:
  - `.planning_temp/`: Stale temporary planning directory.
  - `.temp-reports/`: Temporary exported CSV and PDF reports.
  - `scratch/`: 38 obsolete legacy patch scripts, backup tsx components, and unreferenced diagnostic scripts.
  - `out/`: Stale build export artifacts.
- **D-02 (Schema Directory Hygiene):** Clean misplaced scripts from `src/server/db/schema/`:
  - Move `src/server/db/schema/set-password.ts` to `scripts/set-password.ts` for administrative credential resets.
  - Delete `src/server/db/schema/fix-users.ts` (obsolete one-off patch script).
- **D-03 (Documentation Organization):** Move root markdown documentation files (`DEPLOYMENT.md`, `USER-GUIDE.md`) to `docs/` and clean redundant root duplicates (`API.md`, `ARCHITECTURE.md`, `CONFIGURATION.md`, `DEVELOPMENT.md`, `GETTING-STARTED.md`, `TESTING.md`).
- **D-04 (Unused Libraries Removal):** Remove all confirmed unused/redundant libraries from `package.json`:
  - Confirmed 0-reference packages: `calender`, `dlx`, `tabs`, `@skelon/core`, `tw-animate-css`, `input-otp`, `html2canvas`, `puppeteer`, `shadcn`.
  - Additional discovered 0-reference packages: `reactflow`, `dagre`, `@types/dagre`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `radix-ui` (umbrella), `jszip`, `cmdk`, `@base-ui/react`, `leaflet.markercluster`, `react-leaflet-cluster`, `@types/leaflet.markercluster`.
- **D-05 (Lockfile Pruning):** Run `pnpm install` after dependency removal to prune `pnpm-lock.yaml`.
- **D-06 (Twilio & Resend Pruning):** Remove unreferenced communication layer:
  - Delete `src/server/lib/communication.ts` (unimported file).
  - Remove `twilio` and `resend` packages from `package.json`.
  - Remove unused environment variables (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `RESEND_API_KEY`) from `src/env.js`, `.env`, and `.env.example`.
- **D-07 (Unused Imports & Variables):** Audit and remove unused icons, variables, and unreferenced imports across UI pages and server services.
- **D-08 (Strict Verification):** Verify that all 37 automated tests (`pnpm vitest run`) pass without failure and runtime builds remain stable.

### The Agent's Discretion
- Ordering of tasks to prevent breaking compilation or test suites midway.
- Safe pruning of verified orphaned types and dev dependencies.

### Deferred Ideas (OUT OF SCOPE)
- None.
</user_constraints>

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File & Directory Cleanup | Filesystem / Repo Root | — | Deletion of dead scratch scripts, build artifacts, and misplaced schema utilities |
| Dependency Pruning | Package Manager / Root | Build System | Removal of unreferenced packages in `package.json` and lockfile pruning via `pnpm` |
| Environment Variable Audit | Config & Runtime Environment | Server / API | Removal of unused Twilio/Resend schema keys from `src/env.js` |
| Dead Code & Import Pruning | Frontend & Backend Code | Static Analysis / Lint | Cleaning unused symbols and resolving lint warnings |

</architectural_responsibility_map>

## Detailed Audit Findings

### 1. Files & Directories Audit
1. **`.planning_temp/`**: Contains stale planning copies. Safe to delete.
2. **`.temp-reports/`**: Contains sample test PDF/CSV. Safe to delete.
3. **`scratch/`**: Contains 38 scripts (`patch_*.py`, `advances_old.tsx`, etc.). None are imported by `src/` or `tests/`. Safe to delete.
4. **`out/`**: Stale Next.js static output. Safe to delete.
5. **`src/server/db/schema/`**:
   - `fix-users.ts`: One-off utility, safe to delete.
   - `set-password.ts`: Useful admin CLI, should be moved to `scripts/set-password.ts`.
6. **Root Documentation**:
   - `DEPLOYMENT.md` and `USER-GUIDE.md`: Move to `docs/`.
   - `API.md`, `ARCHITECTURE.md`, `CONFIGURATION.md`, `DEVELOPMENT.md`, `GETTING-STARTED.md`, `TESTING.md`: Already exist in `docs/` with richer content. Safe to remove root copies.

### 2. Dependency Audit (`package.json`)
The following packages have zero import references across `src/`, `scripts/`, and `tests/`:
- **Completely Unused Runtime Dependencies:**
  - `calender`: Typo package, 0 usages.
  - `dlx`: 0 usages.
  - `tabs`: 0 usages (app uses `@radix-ui/react-tabs`).
  - `@skelon/core`: 0 usages.
  - `tw-animate-css`: 0 usages.
  - `input-otp`: 0 usages.
  - `html2canvas`: 0 usages.
  - `shadcn`: 0 usages (CLI package accidentally in runtime dependencies).
  - `twilio`: Only referenced in unimported `communication.ts`.
  - `resend`: Only referenced in unimported `communication.ts`.
  - `reactflow`: 0 usages (org-chart uses custom CSS flex/grid).
  - `dagre`: 0 usages.
  - `embla-carousel-react`: 0 usages.
  - `react-day-picker`: 0 usages.
  - `react-resizable-panels`: 0 usages.
  - `radix-ui`: Umbrella package with 0 usages (specific `@radix-ui/react-*` packages are used).
  - `jszip`: 0 usages.
  - `cmdk`: 0 usages.
  - `@base-ui/react`: 0 usages.
  - `leaflet.markercluster`: 0 usages.
  - `react-leaflet-cluster`: 0 usages.
- **Completely Unused Dev Dependencies:**
  - `puppeteer`: 0 usages in test suites or source code (downloads 300MB+ Chromium binary).
  - `@types/dagre`: 0 usages.
  - `@types/leaflet.markercluster`: 0 usages.

### 3. Environment Variables Audit (`src/env.js`)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: Defined in `src/env.js` as optional strings. Once `communication.ts` is removed, these are 100% unused.
- `RESEND_API_KEY`: Defined in `src/env.js` as optional string. Once `communication.ts` is removed, this is 100% unused.
- Removing them from `server` and `runtimeEnv` in `src/env.js` simplifies environment configuration and removes phantom requirements from `.env.example`.

### 4. Dead Code & Lint Audit
- `src/server/lib/communication.ts`: Dead module (120 lines). Remove.
- `src/app/admin/developer/page.tsx`: Unused imports (`Users`, `Lock`, `Unlock`, `EyeOff`, `Server`, `isSettingsLoading`).
- `src/app/admin/org-chart/page.tsx`: Unused import `Users`.
- `src/app/admin/reports/page.tsx`: Unused import `Printer`.
- `src/app/admin/users/page.tsx`: Unused imports (`Key`, `CardHeader`, `CardTitle`, `CardDescription`).
- `src/app/admin/users/[id]/page.tsx`: Unused imports (`useParams`, `UploadedFile`).
- `src/app/admin/users/AddUserForm.tsx`: Unused variable `nextCode`.

### 5. Verification Gate
- Test command: `pnpm vitest run` (Must maintain 37/37 tests passing across all 4 suites).
- Build command: `pnpm check` (Typecheck and lint verification).

---
*Research completed: 2026-10-31*
