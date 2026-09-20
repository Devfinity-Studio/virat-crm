# Phase 53: Mobile Application Wrapper (Capacitor)

## Context & Decisions

This phase aims to deploy the `virat-crm` application as a native mobile application for Android and iOS using the pre-existing Capacitor setup in the repository.

### Key Implementation Decisions
1. **Target Platforms**: The target platforms are **Android** and **iOS**, with a primary emphasis on the **Google Play Store**.
2. **Wrapper Architecture (Approach A)**:
   - The application will NOT be statically exported.
   - It will continue to use the current Capacitor configuration which points to the live hosted Vercel URL (`https://virat-crm.vercel.app`) as the WebView target.
3. **App Store Compliance (Minimum Functionality)**:
   - To ensure the app passes Google Play (and potentially Apple App Store) review, it must not be a "naked" web wrapper.
   - We will integrate deep native enhancements:
     - **Native Push Notifications**: Extending the existing web push setup to include native APNs (iOS) and FCM (Android) configurations via Capacitor plugins.
     - **Background Geolocation**: Fully wiring up the installed `@capacitor-community/background-geolocation` to enable tracking of field employees even when the app is minimized.
4. **Desktop Wrapper (Electron)**: Explicitly excluded from this phase. The focus is strictly mobile.

## Next Steps for Planning Agent (`gsd-plan-phase`)
- Plan the addition of iOS and Android targets using the Capacitor CLI (`npx cap add android` / `npx cap add ios`).
- Outline the configuration changes needed for Firebase Cloud Messaging (FCM) to support native push notifications for Android.
- Outline the necessary Android permission declarations (Manifest files) required for Background Geolocation to function properly.
- Ensure the build instructions for Android Studio are clear for the user.
