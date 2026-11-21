import { Capacitor, registerPlugin } from "@capacitor/core";

export interface RequirementsStatus {
  fineLocation: boolean;
  backgroundLocation: boolean;
  notifications: boolean;
  batteryUnrestricted: boolean;
  gpsEnabled: boolean;
  allPassed: boolean;
}

export interface ForceLogoutStatus {
  forceLogout: boolean;
  reason?: string;
}

export interface BackgroundLocationGuardPluginType {
  checkRequirements(): Promise<RequirementsStatus>;
  requestStep1Permissions(): Promise<RequirementsStatus>;
  openAppSettings(): Promise<void>;
  requestUnrestrictedBattery(): Promise<void>;
  updateAuthToken(options: { token: string }): Promise<void>;
  startTracking(options?: { token?: string }): Promise<void>;
  stopTracking(): Promise<void>;
  checkForceLogout(): Promise<ForceLogoutStatus>;
}

export const BackgroundLocationGuard =
  registerPlugin<BackgroundLocationGuardPluginType>("BackgroundLocationGuard");

/**
 * High-level helper to check requirements safely across Web and Android Native.
 */
export async function getNativeRequirements(): Promise<RequirementsStatus> {
  if (!Capacitor.isNativePlatform()) {
    // In web browser testing, simulate passes based on standard browser APIs
    const hasGeo = typeof window !== "undefined" && "geolocation" in navigator;
    return {
      fineLocation: hasGeo,
      backgroundLocation: true,
      notifications: true,
      batteryUnrestricted: true,
      gpsEnabled: true,
      allPassed: hasGeo,
    };
  }

  try {
    return await BackgroundLocationGuard.checkRequirements();
  } catch (err) {
    console.warn("BackgroundLocationGuard.checkRequirements error:", err);
    return {
      fineLocation: false,
      backgroundLocation: false,
      notifications: false,
      batteryUnrestricted: false,
      gpsEnabled: false,
      allPassed: false,
    };
  }
}
