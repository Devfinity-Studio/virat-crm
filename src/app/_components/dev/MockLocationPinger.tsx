"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";

export function MockLocationPinger() {
  const [isActive, setIsActive] = useState(false);
  const [logsSent, setLogsSent] = useState(0);

  // Example base coordinate (e.g., somewhere in central city)
  const [baseLat] = useState(19.076);
  const [baseLng] = useState(72.877);

  const pingMutation = api.location.recordLocationBatch.useMutation({
    onSuccess: () => setLogsSent((prev) => prev + 1),
    onError: (err: unknown) => console.error("Mock ping failed", err),
  });

  useEffect(() => {
    if (!isActive) return;

    // Ping every 15 seconds for testing purposes
    const interval = setInterval(() => {
      // Add slight random jitter to simulate movement (approx 10-50 meters)
      const jitterLat = (Math.random() - 0.5) * 0.001;
      const jitterLng = (Math.random() - 0.5) * 0.001;

      pingMutation.mutate({
        locations: [
          {
            latitude: baseLat + jitterLat,
            longitude: baseLng + jitterLng,
            accuracy: Math.random() * 10 + 5, // 5 to 15 meters
            isOfflineSynced: false,
            recordedAt: new Date(),
          },
        ],
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [isActive, baseLat, baseLng, pingMutation]);

  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-lg border border-white/10 bg-black/80 p-4 text-white shadow-xl backdrop-blur-md">
      <h3 className="mb-2 text-sm font-semibold">Dev: Location Pinger</h3>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            isActive
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isActive ? "Stop Pinging" : "Start Pinging"}
        </button>
        <div className="text-xs text-gray-400">
          Status: {isActive ? "Pinging every 15s" : "Idle"} <br />
          Pings Sent: {logsSent}
        </div>
      </div>
    </div>
  );
}
