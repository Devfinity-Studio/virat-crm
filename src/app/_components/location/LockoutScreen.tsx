"use client";

import { Lock, RefreshCw, LogIn } from "lucide-react";
import { useState } from "react";
import { flushOfflineQueue, setLockedOut } from "@/lib/offline-location-queue";

interface Props {
  reason?: string;
}

export function LockoutScreen({ reason }: Props) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleReconnectAndSync = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const res = await flushOfflineQueue();
      if (res.syncedCount > 0) {
        setStatusMsg(
          `Successfully synced ${res.syncedCount} remaining pre-lockout coordinates to server. Please log in to unlock.`,
        );
      } else {
        setStatusMsg("Connected. Please re-authenticate to restore your session.");
      }
    } catch {
      setStatusMsg("Connection failed. Check your internet connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReturnToLogin = () => {
    setLockedOut(false);
    window.location.href = "/login?reason=offline_timeout";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/20 text-red-500 ring-8 ring-red-500/10">
          <Lock className="h-10 w-10 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          Security Lockout
        </h1>

        <p className="mt-3 text-sm text-slate-400">
          {reason ??
            "Your device exceeded the 22-minute offline tracking grace period. In accordance with security protocol, your session was automatically terminated."}
        </p>

        <div className="mt-6 w-full rounded-2xl border border-red-900/50 bg-red-950/40 p-4 text-xs text-red-300">
          <strong>Notice:</strong> Management and system administrators have been notified of this offline timeout event.
        </div>

        {statusMsg && (
          <div className="mt-4 w-full rounded-xl bg-slate-800 p-3 text-xs text-slate-300">
            {statusMsg}
          </div>
        )}

        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            onClick={handleReconnectAndSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing Buffer..." : "Check Connection & Sync Buffer"}
          </button>

          <button
            onClick={handleReturnToLogin}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700"
          >
            <LogIn className="h-4 w-4" />
            Proceed to Login
          </button>
        </div>
      </div>
    </div>
  );
}
