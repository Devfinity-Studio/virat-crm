"use client";

import { api } from "@/trpc/react";
import { format } from "date-fns";
import { Clock, MapPin, Navigation } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface TimeSlabHistoryProps {
  userId: string;
  date: Date;
}

export function TimeSlabHistory({ userId, date }: TimeSlabHistoryProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const { data, isLoading } = api.location.getEmployeeTodayRoute.useQuery({
    employeeId: userId,
    date: dateStr,
  });

  const checkpoints = data?.checkpoints ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (checkpoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Navigation className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-700">No location logs found.</p>
        <p className="text-sm text-slate-500">
          The employee has no location history for this date.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] space-y-6 overflow-y-auto py-4 pr-2">
      <div className="relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-50 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <h4 className="font-bold text-slate-800">
              Checkpoints ({format(date, "MMM dd, yyyy")})
            </h4>
          </div>
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
          >
            {checkpoints.length} Checkpoints
          </Badge>
        </div>

        <div className="space-y-3">
          {checkpoints.map((cp, idx) => (
            <div
              key={cp.id}
              className="flex items-start gap-3 rounded-lg bg-slate-50 p-3"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm leading-tight font-medium text-slate-700">
                    {cp.latitude.toFixed(4)}, {cp.longitude.toFixed(4)}
                  </p>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      cp.isOfflineSynced
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {cp.isOfflineSynced ? "Offline Synced" : "Live"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Checkpoint #{idx + 1} recorded at{" "}
                  {format(new Date(cp.recordedAt), "hh:mm:ss a")}
                  {cp.speed !== null &&
                    ` • Speed: ${((cp.speed ?? 0) * 3.6).toFixed(1)} km/h`}
                  {cp.accuracy !== null && ` • ±${cp.accuracy?.toFixed(0)}m`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
