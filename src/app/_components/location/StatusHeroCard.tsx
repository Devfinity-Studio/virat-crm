"use client";

import { CheckCircle2, AlertTriangle, ShieldCheck, Radio, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StatusHeroCardProps {
  userName?: string;
  employeeCode?: string;
  branchName?: string;
  isOnline: boolean;
  permissionStatus: string;
  lastUpdatedText?: string;
  onRequestPermission?: () => void;
}

export function StatusHeroCard({
  userName = "Field Agent",
  employeeCode,
  branchName,
  isOnline,
  permissionStatus,
  lastUpdatedText = "Live",
  onRequestPermission,
}: StatusHeroCardProps) {
  const isHealthy =
    (permissionStatus === "ALWAYS" || permissionStatus === "WHILE_IN_USE") &&
    isOnline;

  if (!isHealthy && permissionStatus === "DENIED") {
    return (
      <div className="overflow-hidden rounded-2xl border-2 border-rose-300 bg-rose-50/80 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <Badge className="mb-1.5 bg-rose-600 font-bold text-white">
              Action Required
            </Badge>
            <h3 className="text-lg font-bold text-slate-900">
              Location Sharing is Off
            </h3>
            <p className="mt-0.5 text-xs text-rose-900 font-medium leading-relaxed">
              Your location must be enabled to record client visits and calculate daily mileage accurately.
            </p>
            {onRequestPermission && (
              <Button
                onClick={onRequestPermission}
                className="mt-3 min-h-[48px] w-full rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white shadow-xs"
              >
                Turn On Location
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/25">
            <CheckCircle2 className="h-8 w-8 stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className="bg-emerald-600 text-[10px] font-bold text-white tracking-wide">
                ON DUTY
              </Badge>
              {employeeCode && (
                <span className="text-xs font-bold text-slate-700 font-mono">
                  {employeeCode}
                </span>
              )}
            </div>
            <h2 className="mt-0.5 text-lg sm:text-xl font-black text-slate-900">
              You are Connected
            </h2>
            <p className="text-xs font-semibold text-emerald-800">
              Location is sharing normally with dispatch
            </p>
          </div>
        </div>
      </div>

      {/* Mini Status Strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100/80 pt-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Navigation className="h-3.5 w-3.5 text-emerald-600" />
          <span>Status:</span>
          <span className="font-semibold text-slate-900">GPS Active</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
          <span>Last sync:</span>
          <span className="font-semibold text-slate-900">{lastUpdatedText}</span>
        </div>
      </div>
    </div>
  );
}

