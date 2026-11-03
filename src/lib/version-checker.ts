import { Capacitor, registerPlugin } from "@capacitor/core";

export interface InstalledAppInfo {
  name: string;
  packageId: string;
  versionName: string;
  versionCode: number;
}

interface LocationBridgePluginType {
  getAppInfo(): Promise<InstalledAppInfo>;
  startService(options?: { token?: string }): Promise<void>;
  stopService(): Promise<void>;
  setToken(options: { token: string }): Promise<void>;
}

export const LocationBridge =
  registerPlugin<LocationBridgePluginType>("LocationBridge");

export interface AppVersionPolicy {
  minVersionCode: number;
  minVersionName: string;
  latestVersionCode: number;
  latestVersionName: string;
  forceUpdate: boolean;
  playStoreUrl: string;
  marketUrl: string;
  appName: string;
  packageId: string;
}

export interface VersionCheckResult {
  isNative: boolean;
  isOutdated: boolean;
  installedVersionName: string;
  installedVersionCode: number;
  policy: AppVersionPolicy;
}

export const DEFAULT_VERSION_POLICY: AppVersionPolicy = {
  minVersionCode: 1,
  minVersionName: "1.1.0",
  latestVersionCode: 5,
  latestVersionName: "1.1.1",
  forceUpdate: true,
  playStoreUrl:
    "https://play.google.com/store/apps/details?id=com.devfinity.viratcrm",
  marketUrl: "market://details?id=com.devfinity.viratcrm",
  appName: "VBPL",
  packageId: "com.devfinity.viratcrm",
};

export async function checkAppVersion(): Promise<VersionCheckResult> {
  const isNative =
    typeof window !== "undefined" && Capacitor.isNativePlatform();

  // Web browsers always run the latest server build
  if (!isNative) {
    return {
      isNative: false,
      isOutdated: false,
      installedVersionName: "web",
      installedVersionCode: 999999,
      policy: DEFAULT_VERSION_POLICY,
    };
  }

  // Fetch version policy from server
  let policy: AppVersionPolicy = DEFAULT_VERSION_POLICY;
  try {
    const res = await fetch("/api/app-version", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as AppVersionPolicy;
      policy = { ...DEFAULT_VERSION_POLICY, ...data };
    }
  } catch (err) {
    console.warn("Failed to fetch app version policy, using default:", err);
  }

  // Inspect native app info
  try {
    const info = await LocationBridge.getAppInfo();
    const installedCode = Number(info.versionCode) || 3;
    const isOutdated = installedCode < policy.minVersionCode;

    return {
      isNative: true,
      isOutdated,
      installedVersionName: info.versionName ?? "1.0.2",
      installedVersionCode: installedCode,
      policy,
    };
  } catch {
    // If LocationBridge.getAppInfo() throws/fails on native platform,
    // this definitively means the device is running the legacy APK (v1.0.2 / versionCode <= 3)
    // which does not have the LocationBridge plugin registered!
    return {
      isNative: true,
      isOutdated: true,
      installedVersionName: "1.0.2",
      installedVersionCode: 3,
      policy,
    };
  }
}

