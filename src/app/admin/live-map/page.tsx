import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import LiveTeamMap from "@/app/_components/maps/LiveTeamMap";
import { Users, MapPin, Activity } from "lucide-react";
import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { Suspense } from "react";
import { api } from "@/trpc/server";
import { db } from "@/server/db";
import { format } from "date-fns";

export default async function LiveMapPage() {
  const activeAgents = await api.location.getLiveTeam();
  const onFieldCount = activeAgents.filter(
    (a) => a.tracking.statusBadge === "ONLINE_TRACKING",
  ).length;

  const today = format(new Date(), "yyyy-MM-dd");
  const visits = await db.query.customerVisits.findMany({
    where: (visits, { eq }) => eq(visits.date, today),
    columns: { id: true },
  });
  const totalVisitsCount = visits.length;
  return (
    <DashboardLayout>
      <FeatureGate featureKey="live-map">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Live Field View
              </h1>
              <p className="text-sm text-gray-500">
                Real-time GPS tracking of active team members.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-blue-600">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-bold tracking-wider uppercase">
                  Tracking Active
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    On Field
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {onFieldCount} Agents
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
                  <MapPin className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    Total Visits
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {totalVisitsCount} Points
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    System Pulse
                  </p>
                  <p className="text-xl font-bold text-gray-900">Healthy</p>
                </div>
              </div>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="flex h-[400px] w-full animate-pulse items-center justify-center rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-center">
                  <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <p className="animate-pulse text-xs font-medium text-gray-500">
                    Loading map container...
                  </p>
                </div>
              </div>
            }
          >
            <LiveTeamMap />
          </Suspense>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">
              Tracking Privacy Notice
            </h3>
            <p className="text-xs leading-relaxed text-gray-500">
              Location data is collected exclusively during active
              &quot;Checked-In&quot; hours. Background tracking is
              battery-optimized and only visible to assigned managers.
              Historical data is purged after 30 days per company data retention
              policies.
            </p>
          </div>
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
}
