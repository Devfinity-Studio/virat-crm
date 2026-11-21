# Phase 60: Native Android Background Location Guard & Visual Permission Gatekeeper

## 1. Goal
Implement a rock-solid, enterprise-grade native Android background location tracking system with a blocking multi-step visual permission & battery gatekeeper UI so field employees cannot access or operate the CRM application until all required system settings ("Allow all the time", Unrestricted Battery, Notifications, and GPS hardware) are active.

## 2. Core Requirements

### A. Blocking Visual Permission Gatekeeper UI
- Full-screen, non-dismissible setup wizard in Next.js/Tailwind matching the app's clean light mode design.
- Re-verified on initial load and on every app resume (`App.addListener('appStateChange')` / foreground transition).
- **Step 1: Foreground Location & Notifications**
  - Requests `ACCESS_FINE_LOCATION` and `POST_NOTIFICATIONS` (Android 13+).
  - Shows green checkmark once granted; blocks Step 2 until completed.
- **Step 2: Background Location ("Allow all the time")**
  - Native verification of `ACCESS_BACKGROUND_LOCATION`.
  - If only "While using the app" or denied:
    - Display visual mockup card illustrating the Android Settings permission screen with "Allow all the time" highlighted.
    - Provide "Open Location Settings" button invoking `Settings.ACTION_APPLICATION_DETAILS_SETTINGS`.
    - Hard lock: user cannot proceed to app until verified granted.
- **Step 3: Unrestricted Battery Usage**
  - Native verification of `PowerManager.isIgnoringBatteryOptimizations(packageName)`.
  - If battery optimization is active (Optimized/Restricted):
    - Display visual mockup card illustrating App Info ➔ Battery ➔ "Unrestricted" with OEM callouts (Samsung, Xiaomi/MIUI, Vivo, OnePlus).
    - Provide primary "Allow Unrestricted Battery" button invoking `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, plus "Open App Info" fallback button.
    - Hard lock: user cannot proceed to app until verified `true`.
- **Runtime Guard**: Revoking any of these permissions or switching back to Optimized battery immediately re-triggers the gatekeeper screen on app resume.

### B. Movement + Stationary Heartbeat & GPS-Off Detection
- Primary distance filter: `distanceFilter: 25` meters.
- Stationary fallback: 5–10 minute heartbeat check (`300`–`600` seconds) to verify GPS services and record stationary ping.
- Tamper / GPS-Off Detection: Broadcast receiver for `android.location.PROVIDERS_CHANGED` and `LocationManager.isLocationEnabled()`. If user disables device GPS, immediately log `gps_disabled` event.

### C. 20-Minute Offline Buffer & Auto-Logout Policy
- Native SQLite database queue for coordinates and status events with exact Unix timestamps.
- Native code batch-POSTs queued records directly to `/api/location/batch-sync` using Bearer auth token.
- Strict 20-Minute Cutoff: If offline buffering exceeds 20 minutes (`currentTime - oldestRecordTime > 20 mins` or last successful server sync > 20 mins):
  1. Purge stale queue (never push telemetry older than 20 mins).
  2. Stop Foreground Service.
  3. Clear stored auth session/token and force-logout the user back to `/login`.

### D. Backend Guardrail
- Server-side check in `/api/location/batch-sync`: Reject any records older than 20 minutes with `401 Unauthorized` or `400 Bad Request`.
