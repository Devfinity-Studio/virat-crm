# CONVENTIONS

- **Formatting:** Prettier is used for code formatting (`pnpm format:write`).
- **Linting:** ESLint is configured for code quality (`pnpm lint`).
- **Typing:** Strict TypeScript typing is enforced.
- **Components:** UI components are primarily located in `src/app/_components` or `src/components`, utilizing Tailwind CSS utility classes and Shadcn UI patterns.
- **API:** All data fetching and mutation should happen via tRPC procedures defined in `src/server/api/routers/` to ensure end-to-end type safety.
- **Database:** Changes to the database schema must be done via Drizzle ORM in `src/server/db/schema/` followed by generating and migrating (`pnpm db:generate`, `pnpm db:migrate`).
