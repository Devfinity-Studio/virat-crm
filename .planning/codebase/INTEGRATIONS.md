---
last_mapped_commit: 8c574802947c74013f90c4768608279f0dee5699
---

# External Integrations

**Analysis Date:** 2026-10-31

## APIs & External Services

**Cloud Object Storage (Cloudflare R2 / AWS S3):**
- Purpose: Secure binary asset storage for user identity documents (10th/12th marksheets, character certificates, stamp agreements), user profile photos, product images, damaged inventory proofs, and generated reports.
- SDK/Client: `@aws-sdk/client-s3` (3.1041.0) and `@aws-sdk/s3-request-presigner` (3.1041.0) via `src/server/lib/r2.ts`.
- Auth: Environment credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
- Architecture: Client requests presigned upload URL from `api.storage.getPresignedUploadUrl` (`src/server/api/routers/storage.ts`), uploads binary data directly from browser/app to R2/S3 bucket, and persists URL reference into PostgreSQL schema (`files`, `userDocuments`).

**Mobile App Platform (Capacitor):**
- Purpose: Encapsulates the Next.js application into native Android and iOS applications with device API access.
- Configuration: `capacitor.config.ts` configured for package `com.devfinity.viratcrm`.
- Native Modules:
  - Background Geolocation (`@capacitor-community/background-geolocation`): Autonomous location streaming during employee shifts.
  - Push Notifications (`@capacitor/push-notifications`): Hardware push tokens registered with APNs/FCM.
  - Device UI Controls: `@capacitor/status-bar` and `@capacitor/splash-screen`.

**Geospatial, Maps & Geocoding:**
- Map Rendering: Leaflet (1.9.4) & React Leaflet (5.0.0) loading tile servers configured by `NEXT_PUBLIC_MAP_TILE_URL` (default OpenStreetMap).
- Reverse Geocoding: OpenStreetMap Nominatim API via `NEXT_PUBLIC_GEOCODING_API_URL` (default `https://nominatim.openstreetmap.org/reverse`).
- Postal Pincode Directory: India Post Pincode API via `NEXT_PUBLIC_PINCODE_API_URL` (default `https://api.postalpincode.in/pincode`) for auto-filling city, district, and state.
- Spatial Math: Turf.js (`@turf/turf`, `@turf/boolean-point-in-polygon`, `@turf/simplify`) in `src/server/api/routers/location.ts` and `src/hooks/use-location-breadcrumbs.ts` for distance, bearing, and geofence boundary checks.

**Push Notifications & Web Push:**
- Protocols: W3C Web Push Protocol (`web-push` 3.6.7) and native Capacitor Push.
- Configuration: `VAPID_PRIVATE_KEY` (server) and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client).
- Endpoint Registry: `pushSubscriptions` table in PostgreSQL stores subscription endpoints, auth keys, and target user IDs for real-time dispatch (`src/server/lib/push.ts`).

**Communication (SMS & Email):**
- SMS Provider: Twilio (`twilio` 6.0.2) configured via `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` for SMS notifications (`src/server/lib/communication.ts`).
- Email Provider: Resend (`resend` 6.12.3) configured via `RESEND_API_KEY` for transactional emails.

## Data Storage

**Databases:**
- Type: PostgreSQL (Neon Serverless PostgreSQL or self-hosted PostgreSQL).
- Connection: Connection pool initialized in `src/server/db/index.ts` via `postgres` driver using `DATABASE_URL`.
- ORM: Drizzle ORM (`drizzle-orm` 0.41.0, `drizzle-kit` 0.30.5).
- Table Naming: All database tables are isolated with the prefix `virat-crm_` using `createTable = pgTableCreator((name) => \`virat-crm_\${name}\`)`.
- Migrations: Handled via `drizzle-kit generate` and `drizzle-kit push`/`migrate` from `drizzle/` directory.

**File Storage:**
- Cloudflare R2 / AWS S3 bucket holding uploaded user documents, photos, and file attachments.

**Caching & State:**
- In-memory system settings cache with fallback to singleton query on `systemSettings` table (`id: "global"`).
- Client-side cache: TanStack React Query (`@tanstack/react-query`) with automatic cache invalidation upon tRPC mutations.

## Authentication & Identity

**Custom JWT Session Management:**
- Implementation: Custom stateless session signing built using `jose` (`src/server/lib/auth.ts`).
- Algorithm: HS256 JWT tokens.
- Secret: `AUTH_SECRET` environment variable.
- Web Transport: Encrypted `httpOnly: true`, `secure: true`, `SameSite: Lax` cookie named `auth-token` (7-day validity).
- Mobile Transport: Bearer token support via `Authorization: Bearer <token>` header (30-day validity for native mobile app).
- Edge Middleware: `src/middleware.ts` intercepts requests, verifies tokens using Edge-compatible JWT verification, and redirects unauthenticated users to `/login`.

## Monitoring & Observability

**Health Check & Monitoring:**
- Route: `/api/monitoring/check` (`src/app/api/monitoring/check/route.ts`) provides system health status, database ping, and environment health.
- Heartbeat: `api.heartbeat` router (`src/server/api/routers/heartbeat.ts`) used by mobile clients to register live employee heartbeat and connectivity state.

**Audit & Operational Logging:**
- Telemetry logs recorded in `locationLogs` and `breadcrumbs`.
- Transaction history tracked in `inventoryTransactions` and customer balance records.

## Environment Configuration

**Required Server Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string with SSL configuration.
- `AUTH_SECRET`: Secret key for JWT signing and token encryption.
- `R2_ACCOUNT_ID`: Cloudflare account identifier.
- `R2_ACCESS_KEY_ID`: S3/R2 storage access key.
- `R2_SECRET_ACCESS_KEY`: S3/R2 storage secret key.
- `R2_BUCKET_NAME`: Bucket name for binary file storage.
- `VAPID_PRIVATE_KEY`: Server private key for Web Push notifications.

**Optional Server Variables:**
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: Twilio SMS credentials.
- `RESEND_API_KEY`: Resend transactional email API key.

**Required Client Environment Variables:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: VAPID public key for browser push notification registration.
- `NEXT_PUBLIC_PINCODE_API_URL`: Postal pincode lookup API endpoint.
- `NEXT_PUBLIC_GEOCODING_API_URL`: Reverse geocoding API endpoint.
- `NEXT_PUBLIC_MAP_TILE_URL`: Map tile layer URL template.
- `NEXT_PUBLIC_MAP_ATTRIBUTION`: Attribution string for map layers.
