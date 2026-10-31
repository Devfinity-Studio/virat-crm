# Phase 56: Codebase, Directory & Dependency Cleanup - Context

**Gathered:** 2026-10-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate unnecessary files, temporary scratch folders, obsolete build artifacts, unused and duplicate npm dependencies, dead environment variables, unreferenced communication services, and unreferenced imports/variables across the Virat CRM repository, verifying that all test suites continue to pass cleanly.

</domain>

<decisions>
## Implementation Decisions

### 1. Temporary Directories & File Purging (`CLEAN-01`)
- **D-01 (Full Clean):** Delete temporary and obsolete directories:
  - `.planning_temp/`: Stale temporary planning directory.
  - `.temp-reports/`: Temporary exported CSV and PDF reports.
  - `scratch/`: 38 obsolete legacy patch scripts, backup tsx components, and unreferenced diagnostic scripts.
  - `out/`: Stale build export artifacts.
- **D-02 (Schema Directory Hygiene):** Clean misplaced scripts from `src/server/db/schema/`:
  - Move `src/server/db/schema/set-password.ts` to `scripts/set-password.ts` for administrative credential resets.
  - Delete `src/server/db/schema/fix-users.ts` (obsolete one-off patch script).
- **D-03 (Documentation Organization):** Move 8 root markdown documentation files (`API.md`, `ARCHITECTURE.md`, `CONFIGURATION.md`, `DEPLOYMENT.md`, `DEVELOPMENT.md`, `GETTING-STARTED.md`, `TESTING.md`, `USER-GUIDE.md`) into `docs/` to keep project root clean while preserving comprehensive developer documentation.

### 2. Dependency & Package Pruning (`CLEAN-02`)
- **D-04 (Unused Libraries Removal):** Remove all confirmed unused/redundant libraries from `package.json`:
  - `calender`: Typo package, not imported anywhere.
  - `dlx`: Unused graph/dance utility.
  - `tabs`: Unused standalone package (project uses `@radix-ui/react-tabs`).
  - `@skelon/core`: Unused skeleton utility.
  - `tw-animate-css`: Unused styling dependency.
  - `input-otp`: Unused OTP component.
  - `html2canvas`: Unused canvas rendering library.
  - `puppeteer`: Unused in devDependencies (eliminates downloading heavy Chromium binary).
  - `shadcn`: Redundant in runtime `dependencies` (CLI tool).
- **D-05 (Lockfile Pruning):** Run `pnpm install` after dependency removal to ensure `pnpm-lock.yaml` is pruned and consistent.

### 3. Environment Variables & Communication Layer (`CLEAN-03`)
- **D-06 (Twilio & Resend Pruning):** Remove unreferenced communication layer:
  - Delete `src/server/lib/communication.ts` (unimported file).
  - Remove `twilio` and `resend` packages from `package.json`.
  - Remove unused environment variables (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `RESEND_API_KEY`) from `src/env.js`, `.env`, and `.env.example`.

### 4. Code References & Unused Import Cleanup (`CLEAN-04`)
- **D-07 (Unused Imports & Variables):** Audit and remove unused icons, variables, and unreferenced imports across UI pages and server services:
  - Clean unused imports in `src/app/admin/developer/page.tsx` (`Users`, `Lock`, `Unlock`, `EyeOff`, `Server`, `isSettingsLoading`).
  - Clean unused variables in `src/app/admin/org-chart/page.tsx` (`Users`).
  - Clean unused imports in `src/app/admin/reports/page.tsx` (`Printer`).
  - Clean unused imports in `src/app/admin/users/page.tsx` (`Key`, `CardHeader`, `CardTitle`, `CardDescription`).
  - Clean unused variables in `src/app/admin/users/[id]/page.tsx` (`useParams`, `UploadedFile`).
  - Clean unused variables in `src/app/admin/users/AddUserForm.tsx` (`nextCode`).
- **D-08 (Strict Verification):** Verify that all 37 automated tests (`pnpm vitest run`) pass without failure, and runtime builds remain stable.

### The Agent's Discretion
- Exact ordering of removal tasks to ensure zero broken imports or build regressions during intermediate steps.
- Safe pruning of any additional orphaned types or utility helpers uncovered during static analysis.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase Intelligence & Standards
- `.planning/codebase/STACK.md` — Active runtime packages and dependencies.
- `.planning/codebase/STRUCTURE.md` — Canonical directory layout and file placement rules.
- `.planning/codebase/CONVENTIONS.md` — Import standards, linting, and path aliases.
- `.planning/codebase/TESTING.md` — Automated Vitest test suite structure (37 tests).

### Project Configuration
- `package.json` — Dependency declarations.
- `src/env.js` — Environment variable schema validation.
- `.env.example` — Template environment variables.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets & Core Patterns
- `scripts/`: Central location for all diagnostic and operational scripts (e.g. `check-users.ts`, `generate-daily-reports.ts`).
- `src/env.js`: Built with `@t3-oss/env-nextjs` and Zod schema. Modifying this requires updating `server` schema and `runtimeEnv` mapping simultaneously.
- `tests/integration/`: Contains 4 test files (`multi-tenant.test.ts`, `report-scoping.test.ts`, `services.test.ts`, `validation.test.ts`) that validate critical business rules.

### Potential Landmines
- When editing `src/env.js`, ensure both `server` schema and `runtimeEnv` mapping match exactly; omitting or mismatching will throw validation errors on server startup.
- Removing `communication.ts` must be accompanied by removing `twilio` and `resend` from `package.json` to prevent orphaned imports.

</code_context>

<specifics>
## Specific Ideas

- Ensure `scripts/` retains only essential, verified utilities.
- Keep `docs/` clean and categorized for future developer reference.
- Execute a final `pnpm vitest run` to ensure all 37 tests remain green.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed strictly within the phase scope of repository, dependency, and code cleanup.

</deferred>

---

*Phase: 56-codebase-dependency-cleanup*
*Context gathered: 2026-10-31*

