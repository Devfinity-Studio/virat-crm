# Configuration

## Environment Variables
The application relies heavily on environment variables for API keys and database connections. These are validated at runtime using `@t3-oss/env-nextjs`.
Refer to `src/env.js` (or equivalent) for the exact Zod schema of required variables.

## Next.js Config
`next.config.js` includes configurations for:
- Image domains (e.g., S3 bucket URLs for profile photos).
- Serwist (PWA / Service Worker integration).

## Tailwind CSS
Configured in `tailwind.config.js`. We use `class-variance-authority` and `tailwind-merge` (`cn` utility) for dynamic styling across shadcn components.
