"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  locationEngine,
  type PermissionState,
  type LocationCoordinates,
} from "@/lib/location-engine";
import {
  isLockedOut,
  getLockoutReason,
  unlockSession,
} from "@/lib/offline-location-queue";
import {
  BackgroundLocationGuard,
  getNativeRequirements,
} from "@/lib/background-location-guard";
import { Capacitor } from "@capacitor/core";
import { PermissionRequiredModal } from "./PermissionRequiredModal";
import { OfflineWarningBanner } from "./OfflineWarningBanner";
import { LockoutScreen } from "./LockoutScreen";
import { toast } from "sonner";

export function LocationTrackerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: user } = api.users.getMe.useQuery(undefined, {
    retry: false,
    staleTime: 60000,
  });

  const [, setPermissionState] =
    useState<PermissionState | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lockedOut, setLockedOutState] = useState(false);
  const [lockoutMsg, setLockoutMsg] = useState("");

  const updateStatusMutation = api.location.updateTrackingStatus.useMutation();
  const updateStatusRef = useRef(updateStatusMutation.mutate);
  updateStatusRef.current = updateStatusMutation.mutate;

  const lastUpdateRef = useRef<{ lat: number; lng: number; time: number }>({
    lat: 0,
    lng: 0,
    time: 0,
  });

  const handlePositionUpdate = useCallback(
    (pos: LocationCoordinates) => {
      // Only track if user is active and on the field (Employee)
      if (!user?.isActive || user.role !== "Employee") return;

      const now = Date.now();
      const prev = lastUpdateRef.current;
      const elapsed = now - prev.time;

      // Throttle: Max once every 30 seconds unless moved > 25 meters (~0.00025 deg)
      const latDiff = Math.abs(pos.latitude - prev.lat);
      const lngDiff = Math.abs(pos.longitude - prev.lng);
      const movedNoticeably = latDiff > 0.00025 || lngDiff > 0.00025;

      if (elapsed < 30000 && !movedNoticeably && prev.time !== 0) {
        return;
      }

      lastUpdateRef.current = {
        lat: pos.latitude,
        lng: pos.longitude,
        time: now,
      };

      updateStatusRef.current({
        locationPermissionStatus: "ALWAYS",
        isOnline: true,
        latitude: pos.latitude,
        longitude: pos.longitude,
      });
    },
    [user?.isActive, user?.role],
  );

  useEffect(() => {
    // Check local lockout state on mount (only applies to field Employee role)
    if (isLockedOut() && user?.role === "Employee") {
      setLockedOutState(true);
      setLockoutMsg(getLockoutReason());
    }
  }, [user?.role]);

  useEffect(() => {
    if (!user || !user.isActive) return;

    // A valid authenticated session clears any stale local lockout flag
    setLockedOutState(false);
    unlockSession();

    // Check if native 20-minute cutoff forced a logout
    if (Capacitor.isNativePlatform()) {
      void (async () => {
        try {
          const res = await BackgroundLocationGuard.checkForceLogout();
          if (res.forceLogout) {
            toast.error(res.reason ?? "Offline grace period (20 minutes) expired.");
            localStorage.removeItem("virat_auth_token");
            await fetch("/api/auth/logout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: res.reason ?? "Offline grace period expired (20 min cutoff)" }),
            });
            router.push("/login");
            return;
          }
        } catch { }
      })();
    }

    // Ensure auth token is cached locally and synced to native SharedPreferences
    void (async () => {
      try {
        let token = typeof window !== "undefined" ? localStorage.getItem("virat_auth_token") : null;
        if (!token) {
          const res = await fetch("/api/auth/token");
          if (res.ok) {
            const data = (await res.json()) as { token?: string };
            if (data.token) {
              token = data.token;
              localStorage.setItem("virat_auth_token", token);
            }
          }
        }
        if (token && Capacitor.isNativePlatform()) {
          await BackgroundLocationGuard.updateAuthToken({ token });
        }
      } catch (err) {
        console.warn("Failed to sync background auth token:", err);
      }
    })();

    // Evaluate gatekeeper checks
    const initEngine = async () => {
      if (Capacitor.isNativePlatform() && user.role === "Employee") {
        const reqs = await getNativeRequirements();
        if (!reqs.allPassed) {
          setShowPermissionModal(true);
          return;
        }
      }

      const perm = await locationEngine.checkPermission();
      setPermissionState(perm);

      if (perm !== "GRANTED") {
        if (user.role === "Employee") {
          setShowPermissionModal(true);
        } else {
          const granted = await locationEngine.requestPermission();
          if (granted) {
            await locationEngine.startTracking();
          }
        }
      } else {
        await locationEngine.startTracking();
      }
    };

    locationEngine.setCallbacks({
      onPositionUpdate: handlePositionUpdate,
      onPermissionChange: (state) => {
        setPermissionState(state);
        if (state === "GRANTED") {
          setShowPermissionModal(false);
          void locationEngine.startTracking();
        } else if (user.role === "Employee") {
          setShowPermissionModal(true);
        }
      },
      onOfflineStatusChange: (offline) => {
        setIsOffline(offline);
      },
      onLockout: (reason) => {
        if (user.role === "Employee") {
          setLockedOutState(true);
          setLockoutMsg(reason);
        }
      },
    });

    void initEngine();

    return () => {
      locationEngine.stopTracking();
    };
  }, [user, handlePositionUpdate, router]);

  const handlePermissionGranted = async () => {
    setShowPermissionModal(false);
    setPermissionState("GRANTED");
    await locationEngine.startTracking();
  };

  if (lockedOut && user?.role === "Employee") {
    return <LockoutScreen reason={lockoutMsg} />;
  }

  return (
    <>
      {isOffline && <OfflineWarningBanner />}
      <PermissionRequiredModal
        isOpen={showPermissionModal && user?.role === "Employee"}
        onGranted={handlePermissionGranted}
      />
      {children}
    </>
  );
}
