"use client";

import { useEffect, useState } from "react";
import { getRemainingGraceMs, getBufferedCount } from "@/lib/offline-location-queue";
import { WifiOff, AlertTriangle } from "lucide-react";

export function OfflineWarningBanner() {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [bufferedCount, setBufferedCount] = useState<number>(0);

  useEffect(() => {
    const update = async () => {
      setRemainingMs(getRemainingGraceMs());
      const count = await getBufferedCount();
      setBufferedCount(count);
    };

    void update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (remainingMs === null || remainingMs <= 0) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const isUrgent = minutes < 5;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-colors ${
        isUrgent ? "bg-red-600 animate-pulse" : "bg-amber-600"
      }`}
    >
      <div className="flex items-center gap-2">
        {isUrgent ? (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0" />
        )}
        <span>
          <strong>Offline Mode Active:</strong> You have{" "}
          <span className="font-bold underline">{timeFormatted}</span> remaining
          before automatic security lockout.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-[11px] opacity-90 sm:inline">
          {bufferedCount} GPS checkpoints buffered locally
        </span>
      </div>
    </div>
  );
}

