"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { api } from "@/trpc/react";
import {
  Search,
  MapPin,
  Clock,
  Compass,
  AlertCircle,
  Bell,
  RefreshCw,
  X,
  Radio,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type * as Leaflet from "leaflet";

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false },
);
const MapFlyTo = dynamic(() => import("./MapFlyTo"), { ssr: false });

type FilterType = "ALL" | "ONLINE" | "BUFFERING" | "DISABLED" | "LOCKED";

export default function LiveTeamMap() {
  const [L, setL] = useState<typeof Leaflet | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );

  // Load Leaflet dynamically on mount
  useEffect(() => {
    import("leaflet").then((leafletModule) => {
      setL(leafletModule.default ?? leafletModule);
    });
  }, []);

  // Poll live team every 12 seconds
  const {
    data: teamLocations = [],
    isLoading: isLoadingTeam,
    refetch: refetchTeam,
  } = api.location.getLiveTeam.useQuery(undefined, {
    refetchInterval: 12000,
  });

  // Poll alerts every 10 seconds
  const { data: alerts = [], refetch: refetchAlerts } =
    api.location.getAdminAlerts.useQuery(
      { limit: 30, unreadOnly: false },
      { refetchInterval: 10000 },
    );

  const markAlertReadMutation = api.location.markAlertRead.useMutation({
    onSuccess: () => void refetchAlerts(),
  });

  // Fetch today's route checkpoints for selected employee
  const {
    data: routeData,
    isLoading: isLoadingRoute,
  } = api.location.getEmployeeTodayRoute.useQuery(
    {
      employeeId: selectedUserId!,
      date: selectedDate,
    },
    {
      enabled: !!selectedUserId,
    },
  );

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return teamLocations.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const code = (emp.employeeCode ?? "").toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        code.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "ALL") return true;
      if (activeFilter === "ONLINE")
        return emp.tracking.statusBadge === "ONLINE_TRACKING";
      if (activeFilter === "BUFFERING")
        return emp.tracking.statusBadge === "OFFLINE_BUFFERING";
      if (activeFilter === "DISABLED")
        return emp.tracking.statusBadge === "LOCATION_DISABLED";
      if (activeFilter === "LOCKED")
        return emp.tracking.statusBadge === "LOCKED_OUT";

      return true;
    });
  }, [teamLocations, searchQuery, activeFilter]);

  const selectedEmployee = useMemo(() => {
    return teamLocations.find((e) => e.id === selectedUserId) ?? null;
  }, [teamLocations, selectedUserId]);

  // Create pulsing directional marker icon
  const createPulseIcon = (color: string) => {
    if (!L) return undefined;
    return L.divIcon({
      className: "custom-pulse-marker",
      html: `
        <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14],
    });
  };

  // Convert route checkpoints to polyline lat/lngs
  const routePolyline = useMemo(() => {
    if (!routeData?.checkpoints) return [];
    return routeData.checkpoints.map(
      (cp) => [cp.latitude, cp.longitude] as [number, number],
    );
  }, [routeData]);

  // Center coordinates for map flyto
  const centerCoords: [number, number] | null = useMemo(() => {
    if (
      selectedEmployee?.tracking.lastLatitude &&
      selectedEmployee?.tracking.lastLongitude
    ) {
      return [
        selectedEmployee.tracking.lastLatitude,
        selectedEmployee.tracking.lastLongitude,
      ];
    }
    // Default to first employee with coordinates, or New Delhi fallback
    const firstWithLoc = teamLocations.find(
      (e) => e.tracking.lastLatitude && e.tracking.lastLongitude,
    );
    if (
      firstWithLoc?.tracking.lastLatitude &&
      firstWithLoc?.tracking.lastLongitude
    ) {
      return [
        firstWithLoc.tracking.lastLatitude,
        firstWithLoc.tracking.lastLongitude,
      ];
    }
    return [28.6139, 77.209]; // New Delhi center
  }, [selectedEmployee, teamLocations]);

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="relative flex h-[720px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg md:flex-row dark:border-slate-800 dark:bg-slate-900">
      {/* SIDEBAR: Employee Selector & Live Status Drawer */}
      <div className="flex h-1/2 w-full flex-col border-b border-slate-200 md:h-full md:w-80 md:border-r md:border-b-0 dark:border-slate-800">
        {/* Sidebar Header */}
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Field Workforce ({teamLocations.length})
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => void refetchTeam()}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Refresh locations"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingTeam ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={() => setShowAlertsPanel(!showAlertsPanel)}
                className="relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Live Alerts Feed"
              >
                <Bell className="h-4 w-4" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative mt-3">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="mt-2.5 flex flex-wrap gap-1">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "ONLINE", label: "Online" },
                { id: "BUFFERING", label: "Buffering" },
                { id: "DISABLED", label: "Disabled" },
                { id: "LOCKED", label: "Locked" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold tracking-wider uppercase transition-colors ${
                  activeFilter === filter.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Employee Scrollable List */}
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/60">
          {filteredEmployees.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No employees match the current filter.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isSelected = selectedUserId === emp.id;
              const { statusBadge, lastUpdatedAt, lastSpeed } = emp.tracking;

              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedUserId(emp.id)}
                  className={`flex cursor-pointer items-center justify-between p-3.5 transition-colors ${
                    isSelected
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40"
                      : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {emp.profilePhoto ? (
                        <img
                          src={emp.profilePhoto}
                          alt={emp.firstName}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {emp.firstName.charAt(0)}
                          {emp.lastName.charAt(0)}
                        </div>
                      )}
                      {statusBadge === "ONLINE_TRACKING" && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white dark:bg-slate-900">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                          <span className="absolute h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {emp.firstName} {emp.lastName}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {emp.employeeCode}
                        {lastUpdatedAt && (
                          <span>
                            {" "}
                            •{" "}
                            {formatDistanceToNow(new Date(lastUpdatedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-right">
                    {statusBadge === "ONLINE_TRACKING" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                        <Radio className="h-2.5 w-2.5" />
                        Online
                      </span>
                    )}
                    {statusBadge === "OFFLINE_BUFFERING" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/70 dark:text-amber-400">
                        Buffering
                      </span>
                    )}
                    {statusBadge === "LOCATION_DISABLED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700 dark:bg-red-950/70 dark:text-red-400">
                        Disabled
                      </span>
                    )}
                    {statusBadge === "LOCKED_OUT" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700 dark:bg-purple-950/70 dark:text-purple-400">
                        Locked Out
                      </span>
                    )}
                    {lastSpeed !== null && lastSpeed !== undefined && lastSpeed > 0 && (
                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {(lastSpeed * 3.6).toFixed(0)} km/h
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MAP VIEW & CONTROLS */}
      <div className="relative flex-1">
        {/* Top Control Bar on Map */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
          {selectedEmployee && (
            <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md dark:bg-slate-900/95">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Viewing: {selectedEmployee.firstName} {selectedEmployee.lastName}
              </span>
              <button
                onClick={() => setSelectedUserId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Date Picker for Route Playback */}
          <div className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md dark:bg-slate-900/95">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-200"
            />
          </div>
        </div>

        {/* Live Route Summary Badge */}
        {selectedEmployee && routeData && (
          <div className="absolute top-3 right-3 z-[1000] rounded-xl bg-white/95 px-3.5 py-2 shadow-md backdrop-blur-md dark:bg-slate-900/95">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span>
                {routeData.totalCheckpoints} checkpoints on{" "}
                {format(new Date(selectedDate), "MMM dd")}
              </span>
            </div>
            {isLoadingRoute && (
              <span className="text-[10px] text-slate-400">Loading route...</span>
            )}
          </div>
        )}

        {/* Leaflet Map Container */}
        {centerCoords && (
          <MapContainer
            center={centerCoords}
            zoom={14}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapFlyTo center={centerCoords} />

            {/* Render Team Live Positions */}
            {teamLocations.map((emp) => {
              if (
                !emp.tracking.lastLatitude ||
                !emp.tracking.lastLongitude ||
                !L
              )
                return null;

              const isSelected = selectedUserId === emp.id;
              const pinColor =
                emp.tracking.statusBadge === "ONLINE_TRACKING"
                  ? "#10b981"
                  : emp.tracking.statusBadge === "OFFLINE_BUFFERING"
                    ? "#f59e0b"
                    : emp.tracking.statusBadge === "LOCKED_OUT"
                      ? "#a855f7"
                      : "#ef4444";

              const icon = createPulseIcon(pinColor);

              return (
                <Marker
                  key={emp.id}
                  position={[
                    emp.tracking.lastLatitude,
                    emp.tracking.lastLongitude,
                  ]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedUserId(emp.id),
                  }}
                >
                  <Popup>
                    <div className="p-1 text-slate-800">
                      <h4 className="text-sm font-bold">
                        {emp.firstName} {emp.lastName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Code: {emp.employeeCode}
                      </p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {emp.tracking.lastUpdatedAt
                              ? formatDistanceToNow(
                                  new Date(emp.tracking.lastUpdatedAt),
                                  { addSuffix: true },
                                )
                              : "No recent ping"}
                          </span>
                        </div>
                        {emp.tracking.lastSpeed !== null && (
                          <div className="flex items-center gap-1.5">
                            <Compass className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              Speed:{" "}
                              {((emp.tracking.lastSpeed ?? 0) * 3.6).toFixed(1)}{" "}
                              km/h
                            </span>
                          </div>
                        )}
                        {emp.tracking.lastAccuracy !== null && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              Accuracy: ±{emp.tracking.lastAccuracy?.toFixed(0)}{" "}
                              m
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Today's Route Polyline for Selected Employee */}
            {routePolyline.length > 1 && (
              <Polyline
                positions={routePolyline}
                pathOptions={{
                  color: "#2563eb",
                  weight: 4,
                  opacity: 0.85,
                  dashArray: "1, 6",
                }}
              />
            )}

            {/* Checkpoint Pins on Today's Route */}
            {routeData?.checkpoints.map((cp, idx) => (
              <CircleMarker
                key={cp.id}
                center={[cp.latitude, cp.longitude]}
                radius={cp.isOfflineSynced ? 5 : 6}
                pathOptions={{
                  color: cp.isOfflineSynced ? "#f59e0b" : "#2563eb",
                  fillColor: cp.isOfflineSynced ? "#fbbf24" : "#60a5fa",
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-1 text-slate-800">
                    <p className="text-xs font-bold">
                      Checkpoint #{idx + 1}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {format(new Date(cp.recordedAt), "hh:mm:ss a")}
                    </p>
                    <div className="mt-1.5">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          cp.isOfflineSynced
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {cp.isOfflineSynced
                          ? "Synced from Offline Buffer"
                          : "Live Synced"}
                      </span>
                    </div>
                    {cp.speed !== null && (
                      <p className="mt-1 text-[10px] text-slate-600">
                        Speed: {((cp.speed ?? 0) * 3.6).toFixed(1)} km/h
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}

        {/* ALERTS SLIDEOUT PANEL */}
        {showAlertsPanel && (
          <div className="absolute top-0 right-0 bottom-0 z-[1100] w-80 border-l border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md transition-all dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Security Alerts Feed
                </h3>
              </div>
              <button
                onClick={() => setShowAlertsPanel(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-[calc(100%-60px)] divide-y divide-slate-100 overflow-y-auto p-2 dark:divide-slate-800">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No security alerts recorded.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-xl p-3 text-xs transition-colors ${
                      alert.isRead
                        ? "opacity-60"
                        : "bg-red-50/60 dark:bg-red-950/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{alert.title}</span>
                      </div>
                      {!alert.isRead && (
                        <button
                          onClick={() =>
                            markAlertReadMutation.mutate({ alertId: alert.id })
                          }
                          className="shrink-0 text-[10px] font-semibold text-emerald-600 hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>

                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {alert.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        {alert.employee?.firstName} {alert.employee?.lastName} (
                        {alert.employee?.employeeCode})
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(alert.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
