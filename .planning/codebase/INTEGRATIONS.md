# External Integrations & Services

This document details all external service integrations, protocols, and third-party dependencies used in Virat CRM.

## 1. Database & Infrastructure
- **Provider:** PostgreSQL (Neon Serverless PostgreSQL or local PostgreSQL instance)
- **Client Configuration:** Defined in `src/server/db/index.ts` using `postgres` connection pooling.
- **Environment Variable:** `DATABASE_URL`
- **Schema Management:** Drizzle ORM schemas in `src/server/db/schema/` with table prefix `virat-crm_`. Migrations managed via `drizzle-kit generate` and `drizzle-kit push`/`migrate`.

## 2. Object Storage (S3 / Cloudflare R2)
- **Protocol:** AWS S3 Compatible API via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- **Purpose:** Secure upload and storage of:
  - User verification documents (10th/12th marksheets, character certificates, stamp papers, requirement forms)
  - Profile photos and employee avatars
  - Product images and digital sales attachments
  - Damage/replacement proof photographs
- **Environment Variables:**
  - `S3_ENDPOINT` (e.g., Cloudflare R2 endpoint or AWS S3 endpoint)
  - `S3_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY`
  - `S3_BUCKET_NAME`
  - `S3_PUBLIC_DOMAIN` (Optional public CDN gateway)
- **Upload Flow:** Client requests presigned upload URL from `api.storage.getPresignedUploadUrl`, uploads file directly from browser/app to object storage, then confirms record via `files` or `userDocuments` schema.

## 3. Native Mobile Wrapper (Capacitor)
- **Platform:** Capacitor 8 wrapping the responsive Next.js web application (`com.devfinity.viratcrm`).
- **Target OS:** Android (Java/Gradle in `android/`) and iOS (Xcode project in `ios/`).
- **Capacitor Configuration:** `capacitor.config.ts` configured with `server.url` pointed to production deployment (`https://virat-crm.vercel.app`) with cleartext and deep navigation allowances.
- **Native Capabilities:**
  - Background Geolocation (`@capacitor-community/background-geolocation`)
  - Push Notifications (`@capacitor/push-notifications`)
  - Splash Screen & Status Bar styling (`@capacitor/splash-screen`, `@capacitor/status-bar`)

## 4. Location & Geospatial Engine
- **Libraries:** Leaflet, React Leaflet, Turf.js (`@turf/turf`).
- **Purpose:**
  - Live employee location breadcrumbs (`breadcrumbs` table)
  - Daily mileage and travel trajectory calculation (`dailyMileage` table)
  - Geofenced branch attendance: Users check in within defined `radiusMeters` around branch coordinates (`branches` table latitude/longitude).

## 5. Authentication & Token Signing
- **Library:** `jose`
- **Algorithm:** HS256 JWT
- **Secret:** `AUTH_SECRET` (fallback available in dev mode)
- **Cookie Security:** `httpOnly: true`, `secure: true` in production, `SameSite: Lax`
- **Mobile Authentication:** Supports Bearer authorization header `Authorization: Bearer <token>` for persistent 30-day mobile sessions.

## 6. Notifications & Web Push
- **Push Protocols:** Web Push Protocol (`web-push` / standard service worker subscriptions) and Capacitor Push Notifications for native mobile devices.
- **Data Persistence:** `pushSubscriptions` table stores endpoint, auth keys, and user associations for targeted broadcast and transactional alerts.
