"use client";

import { AlertOctagon, CheckCircle2, PhoneCall, RefreshCw, ArrowRight, Wifi, MapPin } from "lucide-react";
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
          `Great! Sent ${res.syncedCount} saved location updates to the server. Now tap Log In below.`,
        );
      } else {
        setStatusMsg("Internet connected! You are ready to log back in.");
      }
    } catch {
      setStatusMsg("Still cannot connect to the internet. Please check your mobile data and try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReturnToLogin = () => {
    setLockedOut(false);
    window.location.href = "/login?reason=offline_timeout";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center py-6">
        {/* Soft Crimson Badge Icon */}
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 text-[#DC2626] shadow-sm">
          <AlertOctagon className="h-10 w-10 stroke-[2.2]" />
        </div>

        {/* Clear, Non-Punitive Heading */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
          Your Shift Was Paused
        </h1>

        {/* Plain Language Explanation */}
        <p className="mt-2 text-base text-slate-600 font-medium leading-relaxed px-2">
          {reason ??
            "Your location was turned off or mobile data was disconnected for over 20 minutes."}
        </p>

        {/* Reassurance Banner */}
        <div className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-left shadow-sm">
          <CheckCircle2 className="h-6 w-6 text-[#16A34A] shrink-0" />
          <p className="text-sm font-semibold text-emerald-950">
            Don&apos;t worry: All your work and customer visits are safely saved.
          </p>
        </div>

        {/* 3 Simple Action Steps */}
        <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Quick 3-Step Fix:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#2563EB] font-bold text-sm">
                <Wifi className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-800">
                1. Turn ON Mobile Data or Wi-Fi
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#2563EB] font-bold text-sm">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-800">
                2. Turn ON Phone Location (GPS)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#2563EB] font-bold text-sm">
                3
              </div>
              <span className="text-sm font-medium text-slate-800">
                3. Tap below to log in and resume
              </span>
            </div>
          </div>
        </div>

        {/* Sync Status Banner */}
        {statusMsg && (
          <div className="mt-4 w-full rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-sm font-semibold text-blue-900 text-left">
            {statusMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={handleReconnectAndSync}
            disabled={isSyncing}
            className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-base font-bold text-slate-700 shadow-sm active:scale-[0.99] hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-5 w-5 text-slate-600 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Checking Internet..." : "Check Internet Connection"}
          </button>

          <button
            type="button"
            onClick={handleReturnToLogin}
            className="flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#2563EB] px-6 py-3.5 text-lg font-bold text-white shadow-lg shadow-blue-500/25 active:scale-[0.99] hover:bg-blue-700 transition"
          >
            <span>Log In &amp; Resume Shift</span>
            <ArrowRight className="h-5 w-5 stroke-[2.5]" />
          </button>

          {/* Help Contact */}
          <a
            href="tel:919876543210"
            className="mt-2 flex min-h-[48px] items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            <PhoneCall className="h-4 w-4" />
            <span>Need help? Call Office Dispatcher</span>
          </a>
        </div>
      </div>
    </div>
  );
}
