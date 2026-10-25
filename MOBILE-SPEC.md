# Virat CRM - Mobile Application Specification (Capacitor Architecture v2.0)

## Overview
Virat CRM Mobile is an enterprise hybrid mobile application built using Next.js, React, and Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`). It provides full mobile parity for field employees with persistent authentication, offline breadcrumb synchronization, and continuous background GPS route tracking.

---

## Architecture & Technology Stack
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Native Runtime**: Capacitor CLI 8 (`@capacitor/cli`, `@capacitor/core`)
- **Native Platforms**:
  - Android (API Level 24+ / Android 7.0 - 14+)
  - iOS (iOS 15+)
- **Location & Geolocation Tracking**:
  - `@capacitor-community/background-geolocation`
  - W3C Geolocation Web Fallback
- **State & Server Communication**:
  - tRPC (`@trpc/client`, `@trpc/react-query`) with React Query v5
  - LocalStorage / IndexedDB queue for offline location breadcrumbs

---

## Background Geolocation & Foreground Service Hardening

### 1. Android 12+ (API 31+) & Android 14 (API 34+) Requirements
Continuous background location on modern Android requires:
1. **Runtime Permissions in `AndroidManifest.xml`**:
   - `android.permission.INTERNET`
   - `android.permission.ACCESS_FINE_LOCATION`
   - `android.permission.ACCESS_COARSE_LOCATION`
   - `android.permission.ACCESS_BACKGROUND_LOCATION` (Requested after coarse/fine location is granted)
   - `android.permission.FOREGROUND_SERVICE`
   - `android.permission.FOREGROUND_SERVICE_LOCATION` (Mandatory for Android 14+)
   - `android.permission.POST_NOTIFICATIONS` (Android 13+)

2. **Persistent Foreground Service Notification**:
   - The OS requires an ongoing, non-dismissible notification while background tracking is active.
   - Channel Name: `Virat CRM Location Service`
   - Notification Title: `Virat CRM Field Tracking`
   - Notification Text: `Active location tracking for sales routes.`
   - Notification Icon: `@mipmap/ic_launcher`

3. **Battery Optimization & OEM Restrictions**:
   - Aggressive battery managers (MIUI, ColorOS, OneUI, EMUI) can terminate background tasks.
   - Users are prompted to exclude Virat CRM from battery optimizations (`Settings > Apps > Special app access > Battery optimization > Don't optimize` or via standard "Don't kill my app" settings).

### 2. iOS 15+ CoreLocation Requirements
- `NSLocationWhenInUseUsageDescription`: "Virat CRM needs your location to record client visits and calculate travel mileage."
- `NSLocationAlwaysAndWhenInUseUsageDescription`: "Virat CRM tracks your route continuously in the background during work hours for mileage calculation and field safety."
- `UIBackgroundModes`: `location`, `fetch`

---

## Offline Breadcrumb Sync Flow
1. **Capture**: Location points (`latitude`, `longitude`, `accuracy`, `timestamp`) are polled at regular intervals or upon significant motion.
2. **Buffer Queue**: If offline or network errors occur, points are appended to `localStorage["virat_crm_offline_breadcrumbs"]`.
3. **Flush**: Upon network restoration or every sync heartbeat (5 minutes), queued points are flushed via `api.location.recordBreadcrumbs` batch mutation.

---

## App Store & Google Play Store Compliance
- Background location access is strictly restricted to authenticated field employees (non-Admin roles).
- Privacy policy and terms of service are accessible before login and in-app.
- In-app disclosures clearly explain why background location is required before triggering system permission dialogues.
