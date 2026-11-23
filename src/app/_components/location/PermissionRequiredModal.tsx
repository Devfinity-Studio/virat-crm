"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Navigation,
  Smartphone,
  BatteryCharging,
  Settings,
  MapPin,
  RefreshCw,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  BackgroundLocationGuard,
  getNativeRequirements,
  type RequirementsStatus,
} from "@/lib/background-location-guard";

interface Props {
  isOpen: boolean;
  onGranted: () => void;
}

type OEMTab = "samsung" | "xiaomi" | "vivo" | "oneplus";

export function PermissionRequiredModal({ isOpen, onGranted }: Props) {
  const [status, setStatus] = useState<RequirementsStatus>({
    fineLocation: false,
    backgroundLocation: false,
    notifications: false,
    batteryUnrestricted: false,
    gpsEnabled: false,
    allPassed: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeOEM, setActiveOEM] = useState<OEMTab>("samsung");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const evaluateRequirements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getNativeRequirements();
      setStatus(res);
      if (res.allPassed) {
        setErrorMessage(null);
        onGranted();
      }
    } catch (err) {
      console.warn("Requirement evaluation failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onGranted]);

  useEffect(() => {
    if (!isOpen) return;

    void evaluateRequirements();

    // Auto re-verify whenever app returns to foreground from system settings
    let appListenerHandle: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener("appStateChange", (state) => {
        if (state.isActive) {
          void evaluateRequirements();
        }
      }).then((handle) => {
        appListenerHandle = handle;
      });
    }

    const handleWindowFocus = () => {
      void evaluateRequirements();
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleWindowFocus);

    return () => {
      if (appListenerHandle) {
        appListenerHandle.remove();
      }
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleWindowFocus);
    };
  }, [isOpen, evaluateRequirements]);

  if (!isOpen) return null;

  // Step 1: Request Foreground Location + Notifications
  const handleRequestStep1 = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await BackgroundLocationGuard.requestStep1Permissions();
        setStatus(res);
        if (res.allPassed) {
          onGranted();
        }
      } else {
        // Web fallback
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            () => {
              void evaluateRequirements();
            },
            () => {
              setErrorMessage("Location permission was denied in your browser.");
            },
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage("Could not request permissions: " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Open App Location Settings for "Allow all the time"
  const handleOpenAppSettings = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      if (Capacitor.isNativePlatform()) {
        await BackgroundLocationGuard.openAppSettings();
      } else {
        alert("Please allow location in your browser settings.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage("Could not open settings: " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 3: Request Ignore Battery Optimizations
  const handleRequestBatteryExemption = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      if (Capacitor.isNativePlatform()) {
        await BackgroundLocationGuard.requestUnrestrictedBattery();
      } else {
        void evaluateRequirements();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage("Could not trigger battery dialog: " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentStep = !status.fineLocation || !status.notifications
    ? 1
    : !status.backgroundLocation
      ? 2
      : !status.batteryUnrestricted
        ? 3
        : 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Navigation className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-50 text-[10px] font-black text-indigo-700 border-indigo-200">
                  SYSTEM GATEKEEPER
                </Badge>
                {isLoading && (
                  <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Setup Required
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void evaluateRequirements()}
            disabled={isLoading}
            className="rounded-xl h-9 px-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`}
            />
            Verify
          </Button>
        </div>

        {/* Progress Tracker (1 - 2 - 3) */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {/* Step 1 Pill */}
          <div
            className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center border transition-all ${status.fineLocation && status.notifications
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
              : currentStep === 1
                ? "border-indigo-400 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20"
                : "border-slate-100 bg-slate-50 text-slate-400"
              }`}
          >
            <div className="flex items-center gap-1">
              {status.fineLocation && status.notifications ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <span className="text-[11px] font-black">1.</span>
              )}
              <span className="text-[11px] font-bold">Location</span>
            </div>
          </div>

          {/* Step 2 Pill */}
          <div
            className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center border transition-all ${status.backgroundLocation
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
              : currentStep === 2
                ? "border-indigo-400 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20"
                : "border-slate-100 bg-slate-50 text-slate-400"
              }`}
          >
            <div className="flex items-center gap-1">
              {status.backgroundLocation ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <span className="text-[11px] font-black">2.</span>
              )}
              <span className="text-[11px] font-bold">All The Time</span>
            </div>
          </div>

          {/* Step 3 Pill */}
          <div
            className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center border transition-all ${status.batteryUnrestricted
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
              : currentStep === 3
                ? "border-indigo-400 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20"
                : "border-slate-100 bg-slate-50 text-slate-400"
              }`}
          >
            <div className="flex items-center gap-1">
              {status.batteryUnrestricted ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <span className="text-[11px] font-black">3.</span>
              )}
              <span className="text-[11px] font-bold">Battery</span>
            </div>
          </div>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* GPS Hardware Disabled Warning */}
        {!status.gpsEnabled && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-950">
            <MapPin className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <span>Device GPS is Turned OFF!</span>
              <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                Swipe down from top of your phone screen and tap Location / GPS to
                enable hardware tracking.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: Foreground Location & Notifications */}
        {currentStep === 1 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Allow Location & Notification Access
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Virat CRM requires location tracking during your active shift
                    for mileage reimbursement, client route logs, and team safety.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleRequestStep1}
              disabled={isProcessing}
              className="w-full h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 min-h-[50px]"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-5 w-5 mr-2" />
              )}
              Enable Foreground Permissions
            </Button>
          </div>
        )}

        {/* STEP 2: Background Location ("Allow all the time") */}
        {currentStep === 2 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Set Location to &quot;Allow all the time&quot;
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Android pauses tracking whenever your phone screen locks unless
                    you select <strong>&quot;Allow all the time&quot;</strong>.
                  </p>
                </div>
              </div>

              {/* Android Settings UI Mockup */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2.5">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                    Android Permission Dialog
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    REQUIRED
                  </Badge>
                </div>

                <div className="space-y-2">
                  {/* Selected Option */}
                  <div className="flex items-center justify-between rounded-xl border-2 border-emerald-500 bg-emerald-50 px-3.5 py-2.5 text-xs font-black text-emerald-950">
                    <div className="flex items-center gap-2.5">
                      <div className="h-4 w-4 rounded-full border-[5px] border-emerald-600 bg-white" />
                      <span>Allow all the time</span>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                      Select This
                    </Badge>
                  </div>

                  {/* Unselected Options */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2 text-xs font-medium text-slate-400">
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                    <span>Allow only while using the app</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2 text-xs font-medium text-slate-400">
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                    <span>Ask every time</span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleOpenAppSettings}
              disabled={isProcessing}
              className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 min-h-[50px]"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Open Location Settings (Tap Permissions)
            </Button>
          </div>
        )}

        {/* STEP 3: Unrestricted Battery Usage */}
        {currentStep === 3 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white font-black text-sm">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Set Battery to &quot;Unrestricted&quot;
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    By default, Android battery savers terminate background services
                    when your phone is in your pocket.
                  </p>
                </div>
              </div>

              {/* Android Battery Mockup */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2.5">
                  <span className="flex items-center gap-1.5">
                    <BatteryCharging className="h-3.5 w-3.5 text-slate-400" />
                    App Info &gt; Battery
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    REQUIRED
                  </Badge>
                </div>

                <div className="space-y-2">
                  {/* Selected Unrestricted Option */}
                  <div className="flex items-center justify-between rounded-xl border-2 border-emerald-500 bg-emerald-50 px-3.5 py-2.5 text-xs font-black text-emerald-950">
                    <div className="flex items-center gap-2.5">
                      <div className="h-4 w-4 rounded-full border-[5px] border-emerald-600 bg-white" />
                      <div>
                        <span className="block font-black">Unrestricted</span>
                        <span className="text-[10px] font-normal text-slate-500">
                          Allows route tracking in background without restrictions
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                      Select
                    </Badge>
                  </div>

                  {/* Standard Optimized */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2 text-xs font-medium text-slate-400">
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                    <span>Optimized (Blocks background GPS)</span>
                  </div>
                </div>
              </div>

              {/* OEM Manufacturer Guides */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                  <span>Device Specific Instructions:</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(["samsung", "xiaomi", "vivo", "oneplus"] as OEMTab[]).map(
                    (oem) => (
                      <button
                        key={oem}
                        type="button"
                        onClick={() => setActiveOEM(oem)}
                        className={`rounded-lg py-1 text-[10px] font-bold capitalize transition-all ${activeOEM === oem
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                      >
                        {oem}
                      </button>
                    ),
                  )}
                </div>

                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2.5 text-[11px] font-medium text-slate-700">
                  {activeOEM === "samsung" && (
                    <p>
                      <strong>Samsung OneUI:</strong> Settings &gt; Apps &gt; VBPL
                      &gt; Battery &gt; Select <strong>&quot;Unrestricted&quot;</strong>.
                    </p>
                  )}
                  {activeOEM === "xiaomi" && (
                    <p>
                      <strong>Xiaomi / MIUI:</strong> Settings &gt; Apps &gt; Manage
                      apps &gt; VBPL &gt; Battery saver &gt; Select{" "}
                      <strong>&quot;No restrictions&quot;</strong>.
                    </p>
                  )}
                  {activeOEM === "vivo" && (
                    <p>
                      <strong>Vivo / iQOO:</strong> Settings &gt; Battery &gt;
                      Background power consumption &gt; VBPL &gt; Enable{" "}
                      <strong>&quot;High background power usage&quot;</strong>.
                    </p>
                  )}
                  {activeOEM === "oneplus" && (
                    <p>
                      <strong>OnePlus / Realme:</strong> Settings &gt; Battery &gt;
                      More settings &gt; Optimize battery use &gt; VBPL &gt; Select{" "}
                      <strong>&quot;Don&apos;t optimize&quot;</strong>.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleRequestBatteryExemption}
                disabled={isProcessing}
                className="w-full h-13 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-600/25 min-h-[50px]"
              >
                <Sliders className="h-5 w-5 mr-2" />
                Allow Unrestricted Battery
              </Button>

              <Button
                variant="outline"
                onClick={handleOpenAppSettings}
                disabled={isProcessing}
                className="w-full h-11 rounded-2xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 min-h-[44px]"
              >
                <Settings className="h-4 w-4 mr-2 text-slate-500" />
                Open App Info Settings (Fallback)
              </Button>
            </div>
          </div>
        )}

        {/* ALL PASSED: Ready */}
        {currentStep === 4 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h3 className="mt-2 text-base font-black text-emerald-950">
                All System Checks Passed!
              </h3>
              <p className="mt-1 text-xs text-emerald-800">
                Continuous background location tracking and unrestricted battery
                optimization are fully configured.
              </p>
            </div>

            <Button
              onClick={onGranted}
              className="w-full h-13 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xl min-h-[50px]"
            >
              Continue to Dashboard
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}

        {/* Footer Reassurance */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Enterprise Shift Security Enforced
          </span>
          <span className="font-mono text-[10px]">v1.1.2</span>
        </div>
      </div>
    </div>
  );
}
