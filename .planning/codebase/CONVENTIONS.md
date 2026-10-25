# Codebase Conventions & Standards

This document establishes the architectural, formatting, and coding conventions adopted throughout the Virat CRM repository.

## 1. TypeScript & Typing Standards
- **Strict Mode:** Enabled in `tsconfig.json` (`strict: true`). Avoid `any` types whenever possible; use properly typed interfaces, generics, or Zod inference (`z.infer<typeof schema>`).
- **Path Aliases:** Use `@/*` imports targeting `src/*` (e.g. `@/server/db`, `@/components/ui/button`, `@/trpc/react`).
- **Server vs Client Separation:**
  - Mark client components with `"use client";` at the top of the file.
  - Server-only modules (database connections, S3 client, password hashing) must reside under `src/server/` or `src/app/api/` and never be imported into client components.

## 2. API & Procedure Standards (tRPC)
- **Procedure Levels:**
  - `publicProcedure`: Open to unauthenticated callers (e.g., login, signup, public branch list).
  - `protectedProcedure`: Requires a valid user session.
  - `featureProtectedProcedure(featureKey)`: Enforces dynamic feature-level authorization checked against `rolePermissions`.
  - `featureManagerProcedure(featureKey)`: Restricts access to users who are Managers, Admins, or Developers.
- **Input Validation:** All procedures accepting user inputs MUST use Zod schemas (`.input(z.object({...}))`).
- **Branch Scoping:** Any operation touching multi-tenant records (Sales, Inventory, Customers) must call `enforceBranchIsolation(ctx, targetBranchId)` to ensure strict branch data boundaries.
- **Transactions:** Complex multi-step operations (e.g., creating a sale + updating inventory + recording ledger) must be wrapped in `ctx.db.transaction(async (tx) => { ... })`.

## 3. Database & Schema Conventions (Drizzle ORM)
- **Naming Conventions:**
  - Tables use camelCase in code and snake_case in SQL definitions, prefixed with `virat-crm_` via `createTable = pgTableCreator((name) => \`virat-crm_\${name}\`)`.
  - Column names use camelCase in TypeScript and snake_case in PostgreSQL (e.g. `employeeCode: varchar("employee_code")`).
- **Primary Keys:** UUID v4 (`uuid().primaryKey().defaultRandom()`) for users and security identities; serial integers for sequential entities (branches, inventory, products).
- **Relations:** Drizzle `relations` definitions must accompany schema definitions in `src/server/db/schema/` to facilitate clean relational queries (`with: { ... }`).

## 4. UI & Styling Conventions
- **Utility Classes:** Use Tailwind CSS utility classes; avoid inline styles.
- **Class Merging:** Use the `cn(...)` utility (`clsx` + `tailwind-merge`) when conditionally combining class names.
- **Design Consistency:** Use predefined design tokens from `shadcn/ui` (e.g., `text-slate-900`, `bg-blue-600`, `border-slate-200`). Avoid arbitrary ad-hoc color values.
- **Responsiveness:** Design with mobile-first responsiveness in mind, as the web application is loaded inside the Capacitor native WebView on iOS and Android.

## 5. Security & Authentication Conventions
- **Passwords:** Passwords must be hashed using `bcrypt.hash(password, 10)` before insertion or update. Plaintext passwords must never be logged or returned in query outputs.
- **Session Tokens:** Signed using `jose` with HS256. Web sessions use secure HTTP-only cookies; mobile sessions support `Authorization: Bearer <token>` headers.
- **Sanitization:** Normalize codes and emails (e.g. `.trim()`, `.toUpperCase()`, or case-insensitive lookups) so users are not blocked by accidental mobile keyboard capitalization.

## 6. Git & Commit Guidelines
- **Commit Messages:** Follow Conventional Commits:
  - `feat(...)`: New user-facing functionality or procedure
  - `fix(...)`: Bug fix or patch
  - `refactor(...)`: Code structural changes without feature modification
  - `docs(...)`: Documentation updates
  - `chore(...)`: Dependency updates or build configuration
