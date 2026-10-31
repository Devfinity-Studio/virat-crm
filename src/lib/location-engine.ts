import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";
import {
  enqueueLocation,
  flushOfflineQueue,
  setOfflineStartedAt,
  clearOfflineStartedAt,
  isBufferExpired,
  setLockedOut,
  isLockedOut,
} from "./offline-location-queue";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  "BackgroundGeolocation",
);

export type PermissionState = "GRANTED" | "DENIED" | "PROMPT" | "NOT_SUPPORTED";

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  recordedAt: Date;
}

export interface LocationEngineCallbacks {
  onPositionUpdate?: (pos: LocationCoordinates) => void;
  onPermissionChange?: (state: PermissionState) => void;
  onOfflineStatusChange?: (isOffline: boolean) => void;
  onLockout?: (reason: string) => void;
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const HEALTH_POLL_INTERVAL_MS = 30 * 1000;

class LocationEngine {
  private isRunning = false;
  private isNative = false;
  private watchId: number | null = null;
  private nativeWatcherId: string | null = null;
  private persistenceTimer: ReturnType<typeof setInterval> | null = null;
  private healthPollTimer: ReturnType<typeof setInterval> | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private latestPosition: LocationCoordinates | null = null;
  private lastPersistedAt: number = 0;
  private callbacks: LocationEngineCallbacks = {};

  constructor() {
    this.isNative =
      typeof window !== "undefined" && Capacitor.isNativePlatform();
  }

  public setCallbacks(callbacks: LocationEngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Check current geolocation permission status.
   */
  public async checkPermission(): Promise<PermissionState> {
    if (typeof window === "undefined") return "NOT_SUPPORTED";

    if (this.isNative) {
      try {
        // Native background location permissions
        return "GRANTED";
      } catch {
        return "PROMPT";
      }
    }

    if (!("permissions" in navigator) || !("geolocation" in navigator)) {
      return "NOT_SUPPORTED";
    }

    try {
      const status = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      if (status.state === "granted") return "GRANTED";
      if (status.state === "denied") return "DENIED";
      return "PROMPT";
    } catch {
      return "PROMPT";
    }
  }

  /**
   * Request location permission from user.
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    if (this.isNative) {
      // In Capacitor native, background geolocation requests fine + coarse + background
      return true;
    }

    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          this.callbacks.onPermissionChange?.("GRANTED");
          resolve(true);
        },
        (error) => {
          console.warn("Geolocation permission prompt error:", error);
          this.callbacks.onPermissionChange?.("DENIED");
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }

  /**
   * Request Screen Wake Lock for Web browser layer.
   */
  private async acquireWakeLock(): Promise<void> {
    if (typeof window === "undefined" || this.isNative) return;
    if ("wakeLock" in navigator && !this.wakeLock) {
      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          this.wakeLock = null;
        });
      } catch (err) {
        console.warn("Wake Lock request failed:", err);
      }
    }
  }

  /**
   * Start high-accuracy location tracking engine.
   */
  public async startTracking(): Promise<boolean> {
    if (this.isRunning || typeof window === "undefined") return true;

    // Check if employee was already locked out
    if (isLockedOut()) {
      this.callbacks.onLockout?.("Offline timeout lockout active.");
      return false;
    }

    this.isRunning = true;
    await this.acquireWakeLock();

    // Re-acquire wake lock on visibility change (Web)
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    // Network listeners
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // Initial online probe
    if (!navigator.onLine) {
      this.handleOffline();
    } else {
      void this.probeHealth();
    }

    // Start 30s health polling for resilient reconnection
    this.healthPollTimer = setInterval(() => {
      void this.probeHealth();
    }, HEALTH_POLL_INTERVAL_MS);

    // Start 15-minute persistent checkpoint flush timer
    this.persistenceTimer = setInterval(() => {
      void this.persistCurrentCheckpoint();
    }, FIFTEEN_MINUTES_MS);

    if (this.isNative) {
      return this.startNativeTracking();
    } else {
      return this.startWebTracking();
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === "visible") {
      void this.acquireWakeLock();
    }
  };

  /**
   * Web Geolocation Watcher
   */
  private startWebTracking(): boolean {
    if (!("geolocation" in navigator)) {
      this.triggerEmergencyRevoke("Geolocation API not available in browser");
      return false;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handleNewPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
          recordedAt: new Date(position.timestamp),
        });
      },
      (error) => {
        console.error("Geolocation watch error:", error);
        if (
          error.code === error.PERMISSION_DENIED ||
          error.code === error.POSITION_UNAVAILABLE
        ) {
          // Trigger immediate logout and alert admins
          this.triggerEmergencyRevoke(
            error.code === error.PERMISSION_DENIED
              ? "Location permission revoked by user"
              : "Device GPS turned off or position unavailable",
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
    );

    return true;
  }

  /**
   * Android APK Native Background Geolocation
   */
  private async startNativeTracking(): Promise<boolean> {
    try {
      this.nativeWatcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Virat CRM is actively logging field location.",
          backgroundTitle: "Field Location Tracking",
          requestPermissions: true,
          stale: false,
          distanceFilter: 10,
        },
        (location, error) => {
          if (error) {
            console.error("Native background geolocation error:", error);
            if (error.code === "NOT_AUTHORIZED") {
              this.triggerEmergencyRevoke(
                "Native background location permission revoked",
              );
            }
            return;
          }
          if (location) {
            this.handleNewPosition({
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy ?? null,
              heading: location.bearing ?? null,
              speed: location.speed ?? null,
              recordedAt: new Date(location.time ?? Date.now()),
            });
          }
        },
      );
      return true;
    } catch (err) {
      console.warn("Native background geolocation initialization failed, fallback to Web:", err);
      return this.startWebTracking();
    }
  }

  /**
   * Ingest a new coordinate sample.
   */
  private async handleNewPosition(pos: LocationCoordinates): Promise<void> {
    this.latestPosition = pos;
    this.callbacks.onPositionUpdate?.(pos);

    // If offline, buffer locally
    if (!navigator.onLine) {
      setOfflineStartedAt(Date.now());
      this.callbacks.onOfflineStatusChange?.(true);

      // Check if 22-minute grace period has expired
      if (isBufferExpired()) {
        this.handleLockout("Offline grace period (22 mins) expired.");
        return;
      }

      await enqueueLocation({
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        heading: pos.heading,
        speed: pos.speed,
        recordedAt: pos.recordedAt.toISOString(),
        isOfflineSynced: true,
      });
      return;
    }

    // If first point upon login or 15 mins elapsed, persist immediately
    const now = Date.now();
    if (now - this.lastPersistedAt >= FIFTEEN_MINUTES_MS) {
      await this.persistCurrentCheckpoint();
    }
  }

  /**
   * Persist current canonical checkpoint to server.
   */
  public async persistCurrentCheckpoint(): Promise<void> {
    if (!this.latestPosition) return;
    const pos = this.latestPosition;
    this.lastPersistedAt = Date.now();

    try {
      const res = await fetch("/api/location/batch-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: [
            {
              latitude: pos.latitude,
              longitude: pos.longitude,
              accuracy: pos.accuracy,
              heading: pos.heading,
              speed: pos.speed,
              isOfflineSynced: false,
              recordedAt: pos.recordedAt.toISOString(),
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`Persist checkpoint failed: ${res.status}`);
      }
    } catch (err) {
      console.warn("Failed to persist location checkpoint, queuing offline:", err);
      setOfflineStartedAt(Date.now());
      this.callbacks.onOfflineStatusChange?.(true);
      await enqueueLocation({
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        heading: pos.heading,
        speed: pos.speed,
        recordedAt: pos.recordedAt.toISOString(),
        isOfflineSynced: true,
      });
    }
  }

  /**
   * Health probe for active reconnection detection.
   */
  private async probeHealth(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        // Connection is alive
        const result = await flushOfflineQueue();
        if (result.lockedOut) {
          this.handleLockout("Offline grace period expired while disconnected.");
        } else {
          clearOfflineStartedAt();
          this.callbacks.onOfflineStatusChange?.(false);
        }
      } else {
        this.handleOffline();
      }
    } catch {
      this.handleOffline();
    }
  }

  private handleOnline = (): void => {
    void this.probeHealth();
  };

  private handleOffline = (): void => {
    setOfflineStartedAt(Date.now());
    this.callbacks.onOfflineStatusChange?.(true);

    if (isBufferExpired()) {
      this.handleLockout("Offline grace period (22 mins) expired.");
    }
  };

  /**
   * Hard Lockout execution:
   * Wipe local session, notify callback, and block UI.
   */
  private handleLockout(reason: string): void {
    setLockedOut(true, reason);
    this.stopTracking();
    this.callbacks.onLockout?.(reason);

    // Wipe session cookie on client
    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }

  /**
   * Immediate Emergency Revoke:
   * Triggered when location permission or GPS hardware is disabled.
   */
  public triggerEmergencyRevoke(reason: string): void {
    if (typeof window === "undefined") return;

    console.warn("[EMERGENCY REVOKE]", reason);
    this.stopTracking();

    const payload = JSON.stringify({ reason });

    // 1. Send beacon or keepalive fetch so it survives page navigation/teardown
    if ("sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/location/emergency-revoke", blob);
    } else {
      void fetch("/api/location/emergency-revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }

    // 2. Clear client session cookie
    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // 3. Immediately redirect to login with reason
    window.location.href = `/login?reason=location_disabled`;
  }

  /**
   * Stop tracking engine.
   */
  public stopTracking(): void {
    this.isRunning = false;

    if (this.watchId !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.nativeWatcherId !== null) {
      void BackgroundGeolocation.removeWatcher({
        id: this.nativeWatcherId,
      });
      this.nativeWatcherId = null;
    }

    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
    }

    if (this.healthPollTimer) {
      clearInterval(this.healthPollTimer);
      this.healthPollTimer = null;
    }

    if (this.wakeLock) {
      void this.wakeLock.release();
      this.wakeLock = null;
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      if (typeof document !== "undefined") {
        document.removeEventListener(
          "visibilitychange",
          this.handleVisibilityChange,
        );
      }
    }
  }
}

export const locationEngine = new LocationEngine();

