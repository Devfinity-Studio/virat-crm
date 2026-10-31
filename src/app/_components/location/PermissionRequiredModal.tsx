"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Navigation, Smartphone } from "lucide-react";
import { locationEngine } from "@/lib/location-engine";
import { Badge } from "@/components/ui/badge";

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
          "Location access was not enabled. Please open Android Settings > Apps > Virat CRM > Permissions > Location, and select 'Allow all the time'.",
        );
      }
    } catch {
      setErrorMsg("Failed to open location prompt. Please enable High Accuracy GPS in your device settings.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl">
        {/* Header Badge & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
            <Navigation className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <Badge className="bg-blue-50 text-[10px] font-bold text-blue-700 border-blue-200 mb-0.5">
              STEP-BY-STEP SETUP
            </Badge>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Enable Location Access
            </h2>
          </div>
        </div>

        {/* Friendly Reassurance Note */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 font-medium">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Your privacy is protected:</strong> Your location is only shared with your branch manager while you are on active duty for customer visits and route safety.
          </p>
        </div>

        {/* 3-Step Visual Checklist */}
        <div className="mt-4 space-y-3">
          {/* Step 1 */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
              1
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-900">Tap &quot;Turn On Location Now&quot; below</p>
              <p className="text-slate-500 mt-0.5">This will open your phone&apos;s location permission prompt.</p>
            </div>
          </div>

          {/* Step 2 - Featured with Mockup Dialog */}
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/40 p-3.5 space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                2
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900">Select &quot;Allow all the time&quot;</p>
                <p className="text-slate-600 mt-0.5">
                  This keeps route tracking working smoothly even when your phone is in your pocket between stops.
                </p>
              </div>
            </div>

            {/* Mock Android Dialog */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-2">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Android System Prompt Preview</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between rounded-lg border-2 border-emerald-500 bg-emerald-50/80 px-3 py-2 text-xs font-bold text-emerald-950">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 rounded-full border-4 border-emerald-600 bg-white" />
                    <span>Allow all the time</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-200/80 px-1.5 py-0.5 rounded">
                    Tap This
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 opacity-60">
                  <div className="h-3.5 w-3.5 rounded-full border border-slate-300" />
                  <span>Allow only while using the app</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-black text-white">
              3
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-900">Keep GPS active during shift</p>
              <p className="text-slate-500 mt-0.5">Your live location ensures daily mileage is recorded for expense reimbursement.</p>
            </div>
          </div>
        </div>

        {/* Inline Error */}
        {errorMsg && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Huge 56px Tall Royal Blue CTA */}
        <div className="mt-5">
          <button
            onClick={handleAllowPermission}
            disabled={isRequesting}
            className="flex min-h-[56px] h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] font-bold text-base text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {isRequesting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Checking permissions...</span>
              </>
            ) : (
              <>
                <span>Turn On Location Now</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export const PermissionOnboardingFlow = PermissionRequiredModal;
