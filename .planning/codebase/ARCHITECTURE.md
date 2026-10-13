# ARCHITECTURE

This is a Next.js (App Router) application structured around a serverless-friendly full-stack architecture.

## Core Concepts

- **Frontend:** Next.js React components using Tailwind CSS for styling and shadcn/ui for accessible, pre-built components.
- **State Management:** React Query (via tRPC) for server state. Local state is managed via React hooks.
- **Backend/API:** tRPC API routes providing end-to-end typesafe endpoints.
- **Database:** PostgreSQL accessed via Drizzle ORM.
- **Authentication:** Managed externally via Kinde Auth.

## Data Flow
Client Component -> tRPC hook (`trpc.[router].[procedure].useQuery/useMutation`) -> tRPC Router -> Drizzle ORM -> PostgreSQL.
