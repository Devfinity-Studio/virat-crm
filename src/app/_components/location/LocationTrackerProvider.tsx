"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/trpc/react";
import {
  locationEngine,
  type PermissionState,
  type LocationCoordinates,
} from "@/lib/location-engine";
import { isLockedOut, getLockoutReason } from "@/lib/offline-location-queue";
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
      // Sync heartbeat to server tracking status
      if (user?.role === "Employee") {
        updateStatusMutation.mutate({
          locationPermissionStatus: "ALWAYS",
          isOnline: true,
          latitude: pos.latitude,
          longitude: pos.longitude,
        });
      }
    },
    [user?.role, updateStatusMutation],
  );

  useEffect(() => {
    // Check local lockout state on mount
    if (isLockedOut()) {
      setLockedOutState(true);
      setLockoutMsg(getLockoutReason());
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "Employee") return;

    // Check permission flow on login for Employee
    const initEngine = async () => {
      const perm = await locationEngine.checkPermission();
      setPermissionState(perm);

      if (perm !== "GRANTED") {
        setShowPermissionModal(true);
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
        } else {
          setShowPermissionModal(true);
        }
      },
      onOfflineStatusChange: (offline) => {
        setIsOffline(offline);
      },
      onLockout: (reason) => {
        setLockedOutState(true);
        setLockoutMsg(reason);
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

  if (lockedOut) {
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
