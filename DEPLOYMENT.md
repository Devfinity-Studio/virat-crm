# Deployment Guide

Virat CRM is optimized for deployment on Vercel or any standard Node.js hosting environment.

## Vercel Deployment (Recommended)
1. Push your code to a GitHub repository.
2. Import the project in the Vercel Dashboard.
3. Configure Environment Variables in Vercel settings (match your `.env` requirements).
4. Vercel will automatically detect the Next.js framework and build the application.

## Database Hosting
- Use a managed PostgreSQL provider (e.g., Supabase, Neon, AWS RDS).
- Ensure the connection pool string is correctly set as `DATABASE_URL`.
- Run `npx drizzle-kit push` from your local machine or a CI/CD pipeline to synchronize the schema before the first deployment.

## Storage
- File uploads (documents, profile photos) are configured to use AWS S3 or a compatible object storage service. Ensure your storage bucket is publicly accessible or properly configured with presigned URLs.
