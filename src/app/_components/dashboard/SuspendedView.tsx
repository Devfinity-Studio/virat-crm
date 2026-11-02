"use client";

import { AlertTriangle, PhoneCall, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function SuspendedView() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Successfully logged out");
        router.push("/login");
        router.refresh();
      } else {
        toast.error("Logout failed");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleFixAndResume = async () => {
    setIsChecking(true);
    try {
      // Re-trigger location check
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {
            toast.success("Location signal detected! Refreshing duty status...");
            router.refresh();
          },
          (err) => {
            toast.error("Please enable Location in your phone settings first.");
            router.refresh();
          },
          { enableHighAccuracy: true, timeout: 5000 },
        );
      } else {
        router.refresh();
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-slate-50 p-4 select-none">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        {/* Top Warning Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-semibold text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            Duty Paused • Action Required
          </div>
        </div>

        {/* Hero Crimson Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 shadow-sm">
            <AlertTriangle className="h-10 w-10" />
          </div>
        </div>

        {/* Headline & Description */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Your Location Sharing Was Turned Off
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            To keep duty records accurate and protect your daily travel allowance,
            Virat CRM requires background location to be active during work hours.
          </p>
        </div>

        {/* 3-Step Troubleshooting Card */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            How to resume your shift in 30 seconds
          </h2>
          <ul className="mt-3 space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-[11px]">
                1
              </span>
              <span>
                Swipe down your Android notifications and turn on <strong>Location / GPS</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-[11px]">
                2
              </span>
              <span>
                Ensure <strong>Mobile Data (4G/5G)</strong> is active and connected.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-[11px]">
                3
              </span>
              <span>
                Tap the big button below to verify your signal and resume duty.
              </span>
            </li>
          </ul>
        </div>

        {/* Safe Storage Notice */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>All your shift data and visits are safely saved. No records lost.</span>
        </div>

        {/* Primary Action Button */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={handleFixAndResume}
            disabled={isChecking}
            className="w-full min-h-[56px] rounded-xl bg-blue-600 text-base font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99]"
          >
            {isChecking ? (
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-5 w-5" />
            )}
            Fix & Log Back In
          </Button>

          <div className="flex items-center justify-between pt-2 text-xs">
            <a
              href="tel:1800123456"
              className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-blue-600"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              Call Branch Manager
            </a>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 font-medium transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
