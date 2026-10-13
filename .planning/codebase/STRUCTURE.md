# STRUCTURE

```
virat-crm/
├── src/
│   ├── app/               # Next.js App Router (Pages & Layouts)
│   │   ├── _components/   # Shared UI components for the app
│   │   ├── api/           # Next.js API routes (e.g. tRPC handler, webhooks)
│   │   └── ...            # Feature-specific routes (e.g., sales, inventory, etc.)
│   ├── components/        # Global/Reusable UI components (e.g., shadcn/ui)
│   ├── env.js             # Environment variable validation (T3 Env)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions and shared logic
│   ├── server/            # Backend logic
│   │   ├── api/           # tRPC routers (controllers)
│   │   │   ├── routers/   # Feature-specific tRPC routers
│   │   │   ├── root.ts    # Main tRPC router combining all sub-routers
│   │   │   └── trpc.ts    # tRPC initialization and context
│   │   └── db/            # Database schema and client configuration (Drizzle)
│   │       └── schema/    # Drizzle ORM schema definitions
│   ├── styles/            # Global CSS (Tailwind imports)
│   └── trpc/              # tRPC client setup for React
├── drizzle/               # Database migrations
├── public/                # Static assets
└── .planning/             # Project management and AI context
```
