"use client";

import { useState } from "react";
import { MapPin, ShieldAlert, CheckCircle2 } from "lucide-react";
import { locationEngine } from "@/lib/location-engine";

interface Props {
  isOpen: boolean;
  onGranted: () => void;
}

export function PermissionRequiredModal({ isOpen, onGranted }: Props) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAllowPermission = async () => {
    setIsRequesting(true);
    setErrorMsg(null);
    try {
      const granted = await locationEngine.requestPermission();
      if (granted) {
        onGranted();
      } else {
        setErrorMsg(
          "Location permission was denied. Please open your device/browser settings and allow location access ('Allow all the time' / high accuracy) to proceed.",
        );
      }
    } catch {
      setErrorMsg("Failed to prompt for permission. Please enable GPS manually.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
          <MapPin className="h-7 w-7 animate-bounce" />
        </div>

        <h2 className="text-center text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Mandatory Location Access
        </h2>

        <p className="mt-2 text-center text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          To comply with field operations security and workforce management,
          Virat CRM requires continuous location tracking during your active shift.
        </p>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <p>
              On Android, select <strong>&quot;Allow all the time&quot;</strong> and enable High Accuracy GPS. Disabling location services will automatically log you out and notify management.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600 dark:bg-red-950/50 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleAllowPermission}
            disabled={isRequesting}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isRequesting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Requesting Permission...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Allow Location Access
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

