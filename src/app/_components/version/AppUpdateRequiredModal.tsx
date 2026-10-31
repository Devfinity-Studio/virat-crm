"use client";

import React from "react";
import { DownloadCloud, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import type { AppVersionPolicy } from "@/lib/version-checker";

interface AppUpdateRequiredModalProps {
  installedVersionName: string;
  installedVersionCode: number;
  policy: AppVersionPolicy;
}

export function AppUpdateRequiredModal({
  installedVersionName,
  policy,
}: AppUpdateRequiredModalProps) {
  const handleOpenPlayStore = () => {
    // Attempt market:// deep link first for direct Play Store app launch
    const marketUri = policy.marketUrl || `market://details?id=${policy.packageId}`;
    const webUri = policy.playStoreUrl || `https://play.google.com/store/apps/details?id=${policy.packageId}`;

    try {
      window.location.href = marketUri;
    } catch {
      window.location.href = webUri;
    }

    // Secondary fallback in case the protocol is suppressed
    setTimeout(() => {
      window.location.href = webUri;
    }, 750);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-required-title"
      className="fixed inset-0 z-[999999] flex min-h-[100dvh] flex-col items-center justify-between bg-slate-50 px-6 py-8 text-slate-900 select-none overflow-y-auto"
    >
      {/* Top Section */}
      <div className="w-full max-w-sm flex-1 flex flex-col items-center justify-center text-center">
        {/* Animated Update Icon Header */}
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-600 shadow-xl shadow-blue-500/25">
          <DownloadCloud className="h-12 w-12 text-white animate-bounce" />
          <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-md ring-4 ring-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        {/* Badge */}
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-red-700">
          Strict Update Required
        </span>

        {/* Title & Clear Message */}
        <h1
          id="update-required-title"
          className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl"
        >
          Update {policy.appName} App
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
          A newer, required version of <strong className="font-semibold text-slate-800">{policy.appName}</strong> is now available on Google Play Store.
        </p>
        <p className="mt-1 text-xs text-red-600 font-semibold">
          You must update to this version to continue using the app and logging your field duty.
        </p>

        {/* Version Info Card */}
        <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-left">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
            <span className="font-medium text-slate-500">Your Installed Version</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
              v{installedVersionName}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 text-xs">
            <span className="font-medium text-slate-500">Required Minimum Version</span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
              v{policy.minVersionName}
            </span>
          </div>
        </div>

        {/* Simple 3-Step Guide */}
        <div className="mt-4 w-full rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-left">
          <p className="text-xs font-bold text-blue-900 mb-2">How to update:</p>
          <ol className="space-y-1.5 text-xs text-blue-800">
            <li className="flex items-start gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
              <span>Tap the big button below to open Google Play Store.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">2</span>
              <span>Tap the green <strong>Update</strong> button on Google Play.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">3</span>
              <span>Open VBPL to log in and resume work.</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Bottom Sticky Action Area */}
      <div className="w-full max-w-sm space-y-3 pt-6">
        <button
          type="button"
          onClick={handleOpenPlayStore}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-[0.98] hover:bg-blue-700"
        >
          <ExternalLink className="h-5 w-5" />
          Update on Google Play Store
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:bg-slate-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Already updated? Tap to check again
        </button>
      </div>
    </div>
  );
}
