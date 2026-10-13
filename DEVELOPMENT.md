# Development Guidelines

## Code Style
- We use **ESLint** and **Prettier** for code formatting. Ensure your editor is configured to format on save.
- Follow functional programming paradigms where possible.

## Adding a New Feature
1. **Database**: If a new table is needed, create a new file in `src/server/db/schema` and export it in `index.ts`.
2. **API**: Create a new TRPC router in `src/server/api/routers` and add it to `root.ts`.
3. **UI**: Build your UI in `src/app` using server components by default, adding `"use client"` only for interactivity.
4. **Components**: Use `shadcn/ui` components from `src/components/ui`.

## TRPC Conventions
- Use `publicProcedure` for unauthenticated routes (e.g., login, signup).
- Use `protectedProcedure` for routes requiring an authenticated session.
- Keep mutation logic transactional when updating multiple interconnected tables (e.g., Sales and Inventory).
