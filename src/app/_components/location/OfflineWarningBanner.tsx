"use client";

import { useEffect, useState } from "react";
import { getRemainingGraceMs, getBufferedCount, flushOfflineQueue } from "@/lib/offline-location-queue";
import { WifiOff, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function OfflineWarningBanner() {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [bufferedCount, setBufferedCount] = useState<number>(0);
  const [isFlushing, setIsFlushing] = useState(false);

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

  const handleRetry = async () => {
    setIsFlushing(true);
    try {
      await flushOfflineQueue();
      const count = await getBufferedCount();
      setBufferedCount(count);
    } finally {
      setIsFlushing(false);
    }
  };

  return (
    <div
      className={`relative z-30 mx-auto w-full max-w-lg mb-4 rounded-2xl border p-4 shadow-sm transition-all ${
        isUrgent
          ? "border-rose-300 bg-rose-50 text-rose-950"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${
              isUrgent ? "bg-rose-600" : "bg-amber-600"
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight">
                No Internet Connection
              </span>
              <Badge
                className={`font-mono text-xs font-bold ${
                  isUrgent
                    ? "bg-rose-600 text-white"
                    : "bg-amber-600 text-white"
                }`}
              >
                {timeFormatted} left
              </Badge>
            </div>
            <p className="mt-1 text-xs font-medium leading-relaxed opacity-90">
              Your location & customer records are saved safely on this phone. Please reconnect within{" "}
              <strong>{minutes + 1} minutes</strong> so your shift is not paused.
            </p>
          </div>
        </div>

        <button
          onClick={handleRetry}
          disabled={isFlushing}
          className="shrink-0 flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 active:scale-95 transition-all disabled:opacity-50"
          title="Retry network sync"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFlushing ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Retry</span>
        </button>
      </div>

      {bufferedCount > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-amber-200/80 pt-2.5 text-[11px] font-semibold text-amber-800">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>{bufferedCount} visit & location points stored offline</span>
          </div>
          <span className="opacity-80">Auto-syncs when online</span>
        </div>
      )}
    </div>
  );
}

export const OfflineCountdownBanner = OfflineWarningBanner;
