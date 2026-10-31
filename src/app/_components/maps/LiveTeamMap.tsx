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
  Calendar,
  ChevronRight,
  ShieldAlert,
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
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
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

  // Selected checkpoint object
  const activeCheckpoint = useMemo(() => {
    if (!selectedCheckpointId || !routeData?.checkpoints) return null;
    return routeData.checkpoints.find((cp) => cp.id === selectedCheckpointId) ?? null;
  }, [selectedCheckpointId, routeData]);

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
    if (activeCheckpoint) {
      return [activeCheckpoint.latitude, activeCheckpoint.longitude];
    }
    if (
      selectedEmployee?.tracking.lastLatitude &&
      selectedEmployee?.tracking.lastLongitude
    ) {
      return [
        selectedEmployee.tracking.lastLatitude,
        selectedEmployee.tracking.lastLongitude,
      ];
    }
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
    return [28.6139, 77.209]; // Default center
  }, [activeCheckpoint, selectedEmployee, teamLocations]);

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="relative flex h-[760px] w-full flex-col-reverse overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg md:flex-row">
      {/* SIDEBAR: Employee Selector & Live Status Drawer (Left on Desktop, Bottom on Mobile) */}
      <div className="flex h-[380px] w-full flex-col border-t border-slate-200 md:h-full md:w-96 md:border-r md:border-t-0 bg-white">
        {/* Sidebar Header */}
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
                Field Workforce
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {teamLocations.length} registered employees
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void refetchTeam()}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-xs"
                title="Refresh locations"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingTeam ? "animate-spin" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => setShowAlertsPanel(!showAlertsPanel)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-xs"
                title="Security Alerts"
              >
                <Bell className="h-4 w-4" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Input (Touch friendly 44px) */}
          <div className="relative mt-3">
            <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Filter Pills with Count */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "ONLINE", label: "Online" },
                { id: "BUFFERING", label: "Buffering" },
                { id: "DISABLED", label: "Disabled" },
                { id: "LOCKED", label: "Locked" },
              ] as const
            ).map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`min-h-[30px] rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-tight transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Employee List */}
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-xs font-medium text-slate-400">
              No field employees found matching your criteria.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isSelected = selectedUserId === emp.id;
              const { statusBadge, lastUpdatedAt, lastSpeed } = emp.tracking;

              return (
                <div
                  key={emp.id}
                  onClick={() => {
                    setSelectedUserId(emp.id);
                    setSelectedCheckpointId(null);
                  }}
                  className={`group flex min-h-[64px] cursor-pointer items-center justify-between p-3.5 transition-all ${
                    isSelected
                      ? "bg-blue-50/90 border-l-4 border-blue-600"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {emp.profilePhoto ? (
                        <img
                          src={emp.profilePhoto}
                          alt={emp.firstName}
                          className="h-10 w-10 rounded-full object-cover shadow-xs"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 shadow-xs">
                          {emp.firstName.charAt(0)}
                          {emp.lastName.charAt(0)}
                        </div>
                      )}
                      {statusBadge === "ONLINE_TRACKING" && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {emp.firstName} {emp.lastName}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        <span className="font-mono font-bold text-slate-700">
                          {emp.employeeCode}
                        </span>
                        {lastUpdatedAt && (
                          <span>
                            {" "}•{" "}
                            {formatDistanceToNow(new Date(lastUpdatedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="flex flex-col items-end gap-1">
                    {statusBadge === "ONLINE_TRACKING" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        <Radio className="h-3 w-3" />
                        Online
                      </span>
                    )}
                    {statusBadge === "OFFLINE_BUFFERING" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Buffering
                      </span>
                    )}
                    {statusBadge === "LOCATION_DISABLED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-800">
                        Disabled
                      </span>
                    )}
                    {statusBadge === "LOCKED_OUT" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                        Locked
                      </span>
                    )}
                    {lastSpeed !== null && lastSpeed !== undefined && lastSpeed > 0 && (
                      <span className="text-[10px] font-semibold text-slate-500">
                        {(lastSpeed * 3.6).toFixed(0)} km/h
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MAP & ROUTE SCRUBBER VIEW */}
      <div className="relative flex flex-1 flex-col h-[380px] md:h-full">
        {/* Map Top Floating Controls */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
          {selectedEmployee && (
            <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5 shadow-md border border-slate-200">
              <span className="text-xs font-bold text-slate-900">
                Viewing: {selectedEmployee.firstName} ({selectedEmployee.employeeCode})
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedUserId(null);
                  setSelectedCheckpointId(null);
                }}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Date Picker for Route Playback */}
          <div className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 shadow-md border border-slate-200">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 w-full">
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

                const pinColor =
                  emp.tracking.statusBadge === "ONLINE_TRACKING"
                    ? "#16a34a"
                    : emp.tracking.statusBadge === "OFFLINE_BUFFERING"
                      ? "#d97706"
                      : emp.tracking.statusBadge === "LOCKED_OUT"
                        ? "#9333ea"
                        : "#dc2626";

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
                      click: () => {
                        setSelectedUserId(emp.id);
                        setSelectedCheckpointId(null);
                      },
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-slate-900">
                        <h4 className="text-sm font-bold">
                          {emp.firstName} {emp.lastName}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
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
                                {((emp.tracking.lastSpeed ?? 0) * 3.6).toFixed(1)} km/h
                              </span>
                            </div>
                          )}
                          {emp.tracking.lastAccuracy !== null && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                Accuracy: ±{emp.tracking.lastAccuracy?.toFixed(0)} m
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
                    opacity: 0.9,
                    dashArray: "2, 6",
                  }}
                />
              )}

              {/* Route Checkpoints */}
              {routeData?.checkpoints.map((cp, idx) => {
                const isSelectedCp = selectedCheckpointId === cp.id;
                return (
                  <CircleMarker
                    key={cp.id}
                    center={[cp.latitude, cp.longitude]}
                    radius={isSelectedCp ? 8 : cp.isOfflineSynced ? 5 : 6}
                    pathOptions={{
                      color: isSelectedCp ? "#1e40af" : cp.isOfflineSynced ? "#d97706" : "#2563eb",
                      fillColor: isSelectedCp ? "#3b82f6" : cp.isOfflineSynced ? "#fbbf24" : "#60a5fa",
                      fillOpacity: 0.95,
                      weight: isSelectedCp ? 3 : 2,
                    }}
                    eventHandlers={{
                      click: () => setSelectedCheckpointId(cp.id),
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-slate-900">
                        <p className="text-xs font-bold">
                          Checkpoint #{idx + 1}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {format(new Date(cp.recordedAt), "hh:mm:ss a")}
                        </p>
                        <div className="mt-1">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                              cp.isOfflineSynced
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {cp.isOfflineSynced ? "Offline Buffered" : "Live GPS"}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* Stitch Screen 5: Horizontal Route Scrubber Timeline */}
        {selectedEmployee && routeData && routeData.checkpoints.length > 0 && (
          <div className="border-t border-slate-200 bg-white/95 p-3 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>
                  {routeData.totalCheckpoints} Route Checkpoints on {format(new Date(selectedDate), "MMM dd")}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Tap time to zoom
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {routeData.checkpoints.map((cp, idx) => {
                const isSelected = selectedCheckpointId === cp.id;
                const timeStr = format(new Date(cp.recordedAt), "h:mm a");
                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => setSelectedCheckpointId(cp.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white shadow-xs scale-105"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>#{idx + 1}</span>
                    <span>{timeStr}</span>
                    {cp.isOfflineSynced && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-amber-300" : "bg-amber-500"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Alerts Slideout Feed Panel */}
        {showAlertsPanel && (
          <div className="absolute top-0 right-0 bottom-0 z-[1100] w-full sm:w-88 border-l border-slate-200 bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Field Alerts Feed
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertsPanel(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="h-[calc(100%-60px)] divide-y divide-slate-100 overflow-y-auto p-2">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-slate-400">
                  No security or tracking alerts recorded.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-xl p-3.5 text-xs transition-colors ${
                      alert.isRead ? "opacity-60 bg-white" : "bg-red-50/80 border border-red-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                        <span>{alert.title}</span>
                      </div>
                      {!alert.isRead && (
                        <button
                          type="button"
                          onClick={() =>
                            markAlertReadMutation.mutate({ alertId: alert.id })
                          }
                          className="shrink-0 text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
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
