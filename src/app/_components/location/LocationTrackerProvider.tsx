"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/trpc/react";
import {
  locationEngine,
  type PermissionState,
  type LocationCoordinates,
} from "@/lib/location-engine";
import { isLockedOut, getLockoutReason, unlockSession } from "@/lib/offline-location-queue";
import { PermissionRequiredModal } from "./PermissionRequiredModal";
import { OfflineWarningBanner } from "./OfflineWarningBanner";
import { LockoutScreen } from "./LockoutScreen";

export function LocationTrackerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: user } = api.users.getMe.useQuery(undefined, {
    retry: false,
    staleTime: 60000,
  });

  const [permissionState, setPermissionState] =
    useState<PermissionState | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lockedOut, setLockedOutState] = useState(false);
  const [lockoutMsg, setLockoutMsg] = useState("");

  const updateStatusMutation = api.location.updateTrackingStatus.useMutation();

  const handlePositionUpdate = useCallback(
    (pos: LocationCoordinates) => {
      // Sync position to server tracking status for any authenticated active user
      if (user?.isActive) {
        updateStatusMutation.mutate({
          locationPermissionStatus: "ALWAYS",
          isOnline: true,
          latitude: pos.latitude,
          longitude: pos.longitude,
        });
      }
    },
    [user?.isActive, updateStatusMutation],
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
    if (user.role !== "Employee" || user.isActive) {
      setLockedOutState(false);
      unlockSession();
    }

    // Check permission flow on login
    const initEngine = async () => {
      const perm = await locationEngine.checkPermission();
      setPermissionState(perm);

      if (perm !== "GRANTED") {
        if (user.role === "Employee") {
          setShowPermissionModal(true);
        } else {
          // For non-employees (e.g. Admins/Managers), request permission non-intrusively
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
  }, [user, handlePositionUpdate]);

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
