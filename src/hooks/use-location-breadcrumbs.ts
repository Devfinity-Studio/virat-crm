"use client";

import { useEffect, useRef, useCallback } from "react";
import { api } from "@/trpc/react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

const TRACKING_INTERVAL = 10 * 1000; // 10 seconds

export function useLocationBreadcrumbs() {
  const { data: user } = api.users.getMe.useQuery();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const { mutate: logBreadcrumbBatchMutate } = (
    api.location.logBreadcrumbBatch as any
  ).useMutation();
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watcherIdRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  const syncLocationQueue = useCallback(() => {
    if (isSyncingRef.current) return;
    try {
      const queueStr = localStorage.getItem("capacitor_location_queue");
      if (!queueStr) return;
      const queue = JSON.parse(queueStr) as any[];
      if (!queue || queue.length === 0) return;

      isSyncingRef.current = true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      logBreadcrumbBatchMutate(
        { locations: queue },
        {
          onSuccess: () => {
            isSyncingRef.current = false;
            // Remove exactly what we sent
            const currentQueueStr = localStorage.getItem("capacitor_location_queue");
            if (currentQueueStr) {
               const currentQueue = JSON.parse(currentQueueStr) as any[];
               const remaining = currentQueue.filter(item => !queue.some(q => q.timestamp === item.timestamp));
               localStorage.setItem("capacitor_location_queue", JSON.stringify(remaining));
            }
          },
          onError: (err: any) => {
            isSyncingRef.current = false;
            console.error("Failed to sync offline location queue:", err);
          },
        }
      );
    } catch (e) {
      isSyncingRef.current = false;
      console.error(e);
    }
  }, [logBreadcrumbBatchMutate]);

  const pushToQueueAndSync = useCallback((latitude: number, longitude: number, accuracy: number) => {
    try {
      const queueStr = localStorage.getItem("capacitor_location_queue");
      const queue = queueStr ? JSON.parse(queueStr) : [];
      queue.push({
        latitude,
        longitude,
        accuracy,
        timestamp: Date.now(),
      });
      localStorage.setItem("capacitor_location_queue", JSON.stringify(queue));
      
      syncLocationQueue();
    } catch (e) {
      console.error(e);
    }
  }, [syncLocationQueue]);

  // Web Fallback: HTML5 Foreground Tracking
  const captureLocationWeb = useCallback(() => {
    if (!navigator.geolocation) return;
    if (user?.role === "Admin") return; // Admins are not tracked

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        pushToQueueAndSync(latitude, longitude, accuracy);
      },
      (error) => {
        // If high accuracy failed, try again with low accuracy
        if (error.code === error.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              pushToQueueAndSync(
                pos.coords.latitude,
                pos.coords.longitude,
                pos.coords.accuracy,
              );
            },
            (err) =>
              console.error(
                "Breadcrumb error (low accuracy fallback):",
                err.message,
              ),
            { enableHighAccuracy: false, timeout: 10000 },
          );
        } else {
          console.error("Breadcrumb error:", error.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 1000 * 60 * 5, // Accept cached location up to 5 mins old
      },
    );
  }, [user, pushToQueueAndSync]);

  useEffect(() => {
    // Don't start tracking until we know the user's role
    if (!user) return;

    // If Admin, don't track
    if (user.role === "Admin") {
      if (timerRef.current) clearInterval(timerRef.current);
      if (watcherIdRef.current) {
        void BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current });
        watcherIdRef.current = null;
      }
      return;
    }

    if (Capacitor.isNativePlatform()) {
      // 1. Prompt user about strict background permissions if not already accepted
      const hasConsented = localStorage.getItem("virat_bg_loc_consented");
      if (!hasConsented) {
        const agreed = window.confirm(
          "Virat CRM requires 'Allow all the time' location access to accurately track your routes while the app is minimized. Please select 'Allow all the time' on the next prompt."
        );
        if (!agreed) {
          console.warn("User declined background location pre-prompt.");
          return;
        }
        localStorage.setItem("virat_bg_loc_consented", "true");
      }

      // 2. Start Capacitor Background Geolocation
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Tracking your location for sales routes.",
          backgroundTitle: "Virat CRM Tracking",
          requestPermissions: true,
          stale: false,
          distanceFilter: 0, // Track strictly by time if possible, or trigger on all movements
        },
        (location, error) => {
          if (error) {
            console.error("Background Geolocation Error:", error);
            return;
          }
          if (location) {
            pushToQueueAndSync(
              location.latitude,
              location.longitude,
              location.accuracy ?? 0
            );
          }
        }
      ).then((id) => {
        watcherIdRef.current = id;
      }).catch(console.error);
    } else {
      // 3. Web Fallback
      captureLocationWeb();
      timerRef.current = setInterval(captureLocationWeb, TRACKING_INTERVAL);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (watcherIdRef.current) {
        void BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current });
      }
    };
  }, [user, captureLocationWeb, pushToQueueAndSync]);

  return null;
}
