---
last_mapped_commit: 8c574802947c74013f90c4768608279f0dee5699
---

# Coding Conventions

**Analysis Date:** 2026-10-31

## Naming Patterns

**Files & Directories:**
- Route folders: kebab-case (`live-map`, `field-support`, `feature-access`).
- Next.js special files: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`.
- React Components: PascalCase (`AddUserForm.tsx`, `FeatureGate.tsx`, `Button.tsx`).
- Router & Service files: camelCase (`salesService.ts`, `userService.ts`, `dailyReports.ts`).
- Schema files: camelCase (`users.ts`, `rolePermissions.ts`, `systemSettings.ts`).
- Test files: `*.test.ts` placed in `tests/` or `tests/integration/`.

**Functions & Procedures:**
- camelCase for functions, methods, and tRPC procedure names (`createSale`, `getPresignedUploadUrl`, `recordBreadcrumb`, `generateNextEmployeeCode`).
- Handlers: `handle*` or `on*` for event callbacks (`handleSubmit`, `onValueChange`).

**Variables & Constants:**
- Variables & properties: camelCase (`branchId`, `totalAmount`, `employeeCode`).
- Constants: UPPER_SNAKE_CASE (`SYSTEM_FEATURES`, `SALT_ROUNDS`, `DEFAULT_PAGE_SIZE`).

**Types & Interfaces:**
- PascalCase for interfaces, type aliases, and enums (`SystemFeatureKey`, `UserRole`, `SaleWithItems`).
- Avoid `I` prefix on interfaces.
- Prefer Zod inferred types: `type CreateUserInput = z.infer<typeof createUserSchema>`.

## Code Style

**Formatting:**
- Prettier managed with `.prettierrc` / `prettier.config.js` and `prettier-plugin-tailwindcss`.
- Double quotes, semicolons enabled, 2-space indentation.
- Run check: `pnpm format:check`
- Run auto-fix: `pnpm format:write`

**Linting:**
- ESLint 9 using flat configuration in `eslint.config.js`.
- Rules extend `eslint-config-next` and `typescript-eslint`.
- Run check: `pnpm check` (which runs `next lint && tsc --noEmit`).

## Import Organization

**Order:**
1. External package imports (`react`, `next`, `@trpc/server`, `zod`).
2. Internal absolute imports via path alias `@/*` (`@/server/db`, `@/components/ui`, `@/trpc/react`).
3. Relative imports (`./types`, `../utils`).
4. Type-only imports (`import type { ... } from "..."`).

**Path Aliases:**
- `@/*` maps to `./src/*`.
- Use `@/server/db` for database queries.
- Use `@/server/lib/services/*` for domain service calls.
- Use `@/components/ui/*` for common UI components.
- Use `@/trpc/react` for client-side tRPC hooks.

## Error Handling

**Server Procedures (tRPC):**
- Throw standard `TRPCError` with appropriate HTTP status codes:
  - `UNAUTHORIZED`: When user is unauthenticated or session expired.
  - `FORBIDDEN`: When user lacks feature permission or breaches branch isolation.
  - `BAD_REQUEST`: When input fails domain validation or insufficient stock exists.
  - `NOT_FOUND`: When requested record does not exist.
  - `INTERNAL_SERVER_ERROR`: For unexpected runtime failures.
- Never leak raw database errors or stack traces directly to end users.

**Client UI:**
- Catch mutation errors using `onError: (error) => toast.error(error.message)`.
- Use `<ErrorBoundary>` or fallback states for critical component boundaries.

## Architecture & Service Separation

**Domain Services:**
- Complex business logic, calculations, and multi-table operations must be extracted into `src/server/lib/services/` instead of bloat in router files.
- `salesService.ts`: Stock balance validation, invoice calculation, and inventory transactions.
- `userService.ts`: Sequential employee code calculation, password hashing, and manager hierarchy sync.
- Routers should remain lightweight controller layers handling input parsing, procedure middleware, and service delegation.

**Multi-Tenancy & Security:**
- Any procedure mutating or querying branch-scoped data must enforce branch boundaries using `enforceBranchIsolation(ctx, targetBranchId)`.
- `Developer` and `Admin` users are explicitly allowed cross-branch access.

**Transactions:**
- Multi-table mutations must be wrapped within `ctx.db.transaction(async (tx) => { ... })` to preserve database consistency.

## Authentication & Case-Insensitivity

**User Identity Lookups:**
- Employee codes, emails, and usernames must be looked up case-insensitively using `ilike(table.col, value.trim())` or `sql\`LOWER(${table.col}) = LOWER(${value.trim()})\``.
- Passwords must always be hashed with `bcrypt.hash(password, 10)` before storage.
