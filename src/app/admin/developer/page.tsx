"use client";

import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import { api } from "@/trpc/react";
import {
  ShieldAlert,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Sliders,
  Power,
  AppWindow,
  Smartphone,
  Activity,
  LogIn,
  LogOut,
  AlertOctagon,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AVAILABLE_FEATURES = [
  { key: "dashboard", name: "Dashboard Overview" },
  { key: "crm", name: "CRM / Customers" },
  { key: "sales", name: "Sales / Orders" },
  { key: "inventory", name: "Inventory Management" },
  { key: "workforce", name: "Workforce / Team" },
  { key: "documents", name: "Documents Vault" },
  { key: "replacements", name: "Replacements" },
  { key: "performance", name: "Performance Audits" },
];

function formatDevice(ua?: string | null) {
  if (!ua || ua === "unknown") return "Unknown device";
  if (ua.includes("Android")) return "Android Device";
  if (ua.includes("iPhone")) return "iPhone (iOS)";
  if (ua.includes("iPad")) return "iPad (iOS)";
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Macintosh")) return "Mac OS";
  if (ua.includes("Linux")) return "Linux Device";
  return ua.slice(0, 24);
}

export default function DeveloperPage() {
  const { data: user, isLoading: isUserLoading } = api.users.getMe.useQuery();
  const utils = api.useUtils();

  const { data: settings } = api.developer.getSettings.useQuery(undefined, {
    enabled: user?.role === "Developer",
  });

  const { data: allUsers, isLoading: isUsersLoading } =
    api.users.getAllUsers.useQuery(undefined, {
      enabled: user?.role === "Developer",
    });

  const updateSettingsMutation = api.developer.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Developer settings updated successfully");
      void utils.developer.getSettings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAccountMutation = api.developer.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("User account permanently purged from database");
      void utils.users.getAllUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Audit Logs State
  const [logEventType, setLogEventType] = useState<
    | "ALL"
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILURE"
    | "LOGOUT"
    | "LOCATION_ALERT"
    | "DEVELOPER_ACTION"
    | "SYSTEM_ERROR"
  >("ALL");
  const [logStatus, setLogStatus] = useState<
    "ALL" | "SUCCESS" | "FAILURE" | "WARNING" | "INFO"
  >("ALL");
  const [logSearch, setLogSearch] = useState<string>("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const {
    data: auditLogs,
    isLoading: isLogsLoading,
    isFetching: isLogsFetching,
    refetch: refetchLogs,
  } = api.developer.getAuditLogs.useQuery(
    {
      limit: 100,
      eventType: logEventType,
      status: logStatus,
      search: logSearch.trim() || undefined,
    },
    {
      enabled: user?.role === "Developer",
      refetchInterval: 15000,
    },
  );

  const clearAuditLogsMutation = api.developer.clearAuditLogs.useMutation({
    onSuccess: () => {
      toast.success("Audit logs cleared successfully");
      void refetchLogs();
    },
    onError: (e) => toast.error(e.message),
  });

  const [maxUsersInput, setMaxUsersInput] = useState<string>("");
  const [minVersionCodeInput, setMinVersionCodeInput] = useState<string>("");
  const [latestVersionCodeInput, setLatestVersionCodeInput] =
    useState<string>("");
  const [minVersionNameInput, setMinVersionNameInput] = useState<string>("");
  const [latestVersionNameInput, setLatestVersionNameInput] =
    useState<string>("");

  if (isUserLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (user?.role !== "Developer") {
    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 animate-bounce rounded-full bg-red-50 p-4 text-red-600">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Sovereign Restriction
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            This space is cryptographically bound to the sovereign **System
            Developer** role. Other credentials, including Administrator roles,
            are strictly forbidden.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const activeSettings = settings ?? {
    id: "global",
    maxUsers: 50,
    isSystemLocked: false,
    isReadOnly: false,
    disabledFeaturesGlobal: [] as string[],
    forceUpdateEnabled: false,
    minAppVersionCode: 1,
    latestAppVersionCode: 5,
    minAppVersionName: "1.1.0",
    latestAppVersionName: "1.1.1",
  };

  const handleToggleSystemLock = () => {
    updateSettingsMutation.mutate({
      ...activeSettings,
      isSystemLocked: !activeSettings.isSystemLocked,
    });
  };

  const handleToggleReadOnly = () => {
    updateSettingsMutation.mutate({
      ...activeSettings,
      isReadOnly: !activeSettings.isReadOnly,
    });
  };

  const handleToggleForceUpdate = () => {
    updateSettingsMutation.mutate({
      ...activeSettings,
      forceUpdateEnabled: !activeSettings.forceUpdateEnabled,
    });
  };

  const handleUpdateAppVersionPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      ...activeSettings,
      minAppVersionCode: minVersionCodeInput
        ? parseInt(minVersionCodeInput, 10)
        : activeSettings.minAppVersionCode,
      latestAppVersionCode: latestVersionCodeInput
        ? parseInt(latestVersionCodeInput, 10)
        : activeSettings.latestAppVersionCode,
      minAppVersionName:
        minVersionNameInput.trim() || activeSettings.minAppVersionName,
      latestAppVersionName:
        latestVersionNameInput.trim() || activeSettings.latestAppVersionName,
    });
    setMinVersionCodeInput("");
    setLatestVersionCodeInput("");
    setMinVersionNameInput("");
    setLatestVersionNameInput("");
  };

  const handleFeatureToggle = (featureKey: string) => {
    const isCurrentlyDisabled =
      activeSettings.disabledFeaturesGlobal.includes(featureKey);
    const newDisabled = isCurrentlyDisabled
      ? activeSettings.disabledFeaturesGlobal.filter((f) => f !== featureKey)
      : [...activeSettings.disabledFeaturesGlobal, featureKey];

    updateSettingsMutation.mutate({
      ...activeSettings,
      disabledFeaturesGlobal: newDisabled,
    });
  };

  const handleUpdateMaxUsers = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(maxUsersInput);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid active user count");
      return;
    }
    updateSettingsMutation.mutate({
      ...activeSettings,
      maxUsers: val,
    });
    setMaxUsersInput("");
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (
      confirm(
        `CRITICAL WARNING: You are about to PERMANENTLY DELETE the user "${name}" from the database. This action completely bypasses standard deactivation safety controls and cannot be undone. Do you proceed?`,
      )
    ) {
      deleteAccountMutation.mutate({ userId: id });
    }
  };

  const handleClearLogs = (olderThanDays: number) => {
    const msg =
      olderThanDays === 0
        ? "CRITICAL: You are about to permanently purge ALL system audit logs. This cannot be undone. Continue?"
        : `Are you sure you want to purge audit logs older than ${olderThanDays} days?`;
    if (confirm(msg)) {
      clearAuditLogsMutation.mutate({ olderThanDays });
    }
  };

  // Log counts
  const totalLogs = auditLogs?.length ?? 0;
  const loginSuccessCount =
    auditLogs?.filter((l) => l.eventType === "LOGIN_SUCCESS").length ?? 0;
  const loginFailureCount =
    auditLogs?.filter((l) => l.eventType === "LOGIN_FAILURE").length ?? 0;
  const logoutCount =
    auditLogs?.filter((l) => l.eventType === "LOGOUT").length ?? 0;
  const locationAlertCount =
    auditLogs?.filter((l) => l.eventType === "LOCATION_ALERT").length ?? 0;

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col space-y-8 pb-12">
        {/* Banner */}
        <div className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-8 text-white shadow-2xl md:flex-row md:items-center">
          <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="z-10">
            <Badge className="mb-3 rounded-full bg-red-500 px-3 py-1 text-[10px] font-extrabold tracking-widest text-white uppercase shadow-md hover:bg-red-600">
              Sovereign Console
            </Badge>
            <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
              <Sliders className="h-8 w-8 animate-pulse text-red-500" />
              Developer Omnipotence Panel
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Global system control station. Enforce license user limits,
              trigger total lockouts, toggle maintenance mode, inspect real-time
              security & audit logs, and configure app version policy.
            </p>
          </div>
        </div>

        {/* Global Controls Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Controls Card */}
          <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-xl lg:col-span-2">
            <CardHeader className="border-b border-slate-100 bg-slate-50">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <Power className="h-5 w-5 text-indigo-500" />
                Global Status Killswitches
              </CardTitle>
              <CardDescription>
                Emergency switches that immediately apply across all users and
                branches without restart.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-6">
              {/* Emergency Lockdown */}
              <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Emergency Total Lockdown
                    </span>
                    {activeSettings.isSystemLocked && (
                      <Badge variant="destructive">LOCKED</Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Immediately terminates session privileges for all non-Developer
                    users, blocking database writes, app reads, and background syncs.
                  </p>
                </div>
                <Switch
                  checked={activeSettings.isSystemLocked}
                  onCheckedChange={handleToggleSystemLock}
                  disabled={updateSettingsMutation.isPending}
                />
              </div>

              {/* Read Only Mode */}
              <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Maintenance Read-Only Mode
                    </span>
                    {activeSettings.isReadOnly && (
                      <Badge className="bg-amber-500 hover:bg-amber-600">
                        READ-ONLY
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Allows reading data and generating documents, but blocks
                    creating, modifying, or deleting sales, inventory, or profiles.
                  </p>
                </div>
                <Switch
                  checked={activeSettings.isReadOnly}
                  onCheckedChange={handleToggleReadOnly}
                  disabled={updateSettingsMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* User Limits Card */}
          <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Active Seat Limit
              </CardTitle>
              <CardDescription>
                Hard ceiling for licensed employees in the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <span className="text-xs font-semibold text-slate-600">
                  Current Ceiling
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {activeSettings.maxUsers}{" "}
                  <span className="text-xs font-normal text-slate-400">Seats</span>
                </span>
              </div>

              <form onSubmit={handleUpdateMaxUsers} className="space-y-3">
                <label className="text-xs font-bold text-slate-700">
                  Adjust Active Seat Quota
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="New max seats..."
                    value={maxUsersInput}
                    onChange={(e) => setMaxUsersInput(e.target.value)}
                    className="rounded-xl"
                  />
                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Set
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Global Feature Killswitches */}
        <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-xl">
          <CardHeader className="border-b border-slate-100 bg-slate-50">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <AppWindow className="h-5 w-5 text-indigo-500" />
              Global Modular Feature Toggles
            </CardTitle>
            <CardDescription>
              Instantly enable or disable individual CRM modules across the
              entire organization without redeployment.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            {AVAILABLE_FEATURES.map((feature) => {
              const isDisabled =
                activeSettings.disabledFeaturesGlobal.includes(feature.key);
              return (
                <div
                  key={feature.key}
                  className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                    isDisabled
                      ? "border-red-100 bg-red-50/40"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">
                      {feature.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ID: {feature.key}
                    </span>
                  </div>
                  <Switch
                    checked={!isDisabled}
                    onCheckedChange={() => handleFeatureToggle(feature.key)}
                    disabled={updateSettingsMutation.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Mobile App Version & Force Update Policy */}
        <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-xl">
          <CardHeader className="border-b border-slate-100 bg-slate-50">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Smartphone className="h-5 w-5 text-indigo-500" />
                  Mobile App Force Update & Release Gatekeeper
                </CardTitle>
                <CardDescription>
                  Safely control when mobile APK users are forced to upgrade.
                  Keep Force Update turned OFF until Google Play Store or APK is
                  fully published!
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-2">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800">
                    Force Update Policy
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {activeSettings.forceUpdateEnabled
                      ? "ENABLED (Strict Enforcement)"
                      : "DISABLED (Graceful Access)"}
                  </span>
                </div>
                <Switch
                  checked={activeSettings.forceUpdateEnabled}
                  onCheckedChange={handleToggleForceUpdate}
                  disabled={updateSettingsMutation.isPending}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs leading-relaxed text-amber-900">
              <strong>Best Practice Workflow:</strong> When publishing a new APK
              or Play Store update, keep Force Update <strong>OFF</strong>. Once
              Google approves and makes the APK live for public download, flip the
              toggle above to <strong>ENABLED</strong>.
            </div>

            <form
              onSubmit={handleUpdateAppVersionPolicy}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Min Version Code (Cutoff)
                </label>
                <Input
                  type="number"
                  min="1"
                  className="rounded-xl"
                  value={minVersionCodeInput}
                  onChange={(e) => setMinVersionCodeInput(e.target.value)}
                  placeholder={String(activeSettings.minAppVersionCode)}
                />
                <p className="text-[10px] text-slate-400">
                  Users below this code are blocked when enabled
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Latest Version Code
                </label>
                <Input
                  type="number"
                  min="1"
                  className="rounded-xl"
                  value={latestVersionCodeInput}
                  onChange={(e) => setLatestVersionCodeInput(e.target.value)}
                  placeholder={String(activeSettings.latestAppVersionCode)}
                />
                <p className="text-[10px] text-slate-400">
                  Current release code in Play Store
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Min Version Name
                </label>
                <Input
                  type="text"
                  className="rounded-xl"
                  value={minVersionNameInput}
                  onChange={(e) => setMinVersionNameInput(e.target.value)}
                  placeholder={activeSettings.minAppVersionName}
                />
                <p className="text-[10px] text-slate-400">e.g. 1.1.0</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Latest Version Name
                </label>
                <Input
                  type="text"
                  className="rounded-xl"
                  value={latestVersionNameInput}
                  onChange={(e) => setLatestVersionNameInput(e.target.value)}
                  placeholder={activeSettings.latestAppVersionName}
                />
                <p className="text-[10px] text-slate-400">e.g. 1.1.1</p>
              </div>

              <div className="flex justify-end pt-2 sm:col-span-2 lg:col-span-4">
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  Save Version Policy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* SYSTEM AUDIT & SECURITY LOGS VIEWER */}
        <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-xl">
          <CardHeader className="border-b border-slate-100 bg-slate-50">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  System Audit & Security Logs
                </CardTitle>
                <CardDescription>
                  Full audit trail: track who logged in, who logged out and why,
                  what failed, and real-time security alerts.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchLogs()}
                  disabled={isLogsFetching}
                  className="rounded-xl border-slate-200 text-xs font-semibold"
                >
                  <RefreshCw
                    className={`mr-1.5 h-3.5 w-3.5 ${isLogsFetching ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClearLogs(7)}
                  disabled={clearAuditLogsMutation.isPending}
                  className="rounded-xl border-slate-200 text-xs text-slate-600 hover:text-slate-900"
                >
                  Clear &gt; 7 Days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClearLogs(0)}
                  disabled={clearAuditLogsMutation.isPending}
                  className="rounded-xl text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            {/* Quick Stat Tiles */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-medium text-slate-500">
                  Total Logs
                </span>
                <p className="mt-1 text-2xl font-black text-slate-800">
                  {totalLogs}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <span className="text-xs font-medium text-emerald-700">
                  Successful Logins
                </span>
                <p className="mt-1 text-2xl font-black text-emerald-800">
                  {loginSuccessCount}
                </p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                <span className="text-xs font-medium text-red-700">
                  Failed Logins / Blocks
                </span>
                <p className="mt-1 text-2xl font-black text-red-800">
                  {loginFailureCount}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <span className="text-xs font-medium text-amber-700">
                  Location / GPS Alerts
                </span>
                <p className="mt-1 text-2xl font-black text-amber-800">
                  {locationAlertCount}
                </p>
              </div>
            </div>

            {/* Filter Pills and Search Bar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Event Type Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "ALL", label: "All Logs" },
                  { key: "LOGIN_SUCCESS", label: "Logins" },
                  { key: "LOGIN_FAILURE", label: "Failed" },
                  { key: "LOGOUT", label: "Logouts" },
                  { key: "LOCATION_ALERT", label: "GPS Alerts" },
                  { key: "DEVELOPER_ACTION", label: "Dev Actions" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setLogEventType(
                        item.key as
                          | "ALL"
                          | "LOGIN_SUCCESS"
                          | "LOGIN_FAILURE"
                          | "LOGOUT"
                          | "LOCATION_ALERT"
                          | "DEVELOPER_ACTION",
                      )
                    }
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      logEventType === item.key
                        ? "bg-slate-900 text-white shadow"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[260px]">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search user, code, reason, IP..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="rounded-xl pl-9 text-xs"
                />
                {logSearch && (
                  <button
                    type="button"
                    onClick={() => setLogSearch("")}
                    className="absolute top-2.5 right-3 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Logs Table / List */}
            {isLogsLoading ? (
              <div className="flex justify-center p-12">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : !auditLogs || auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                <FileText className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  No log records found
                </p>
                <p className="text-xs text-slate-400">
                  {logSearch
                    ? "Try adjusting your search criteria or filter pills."
                    : "System activity events will appear here in real time."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 font-bold tracking-wider text-slate-500 uppercase">
                      <th className="p-3 pl-4">Timestamp</th>
                      <th className="p-3">Event</th>
                      <th className="p-3">User / Identity</th>
                      <th className="p-3">Action & Details</th>
                      <th className="p-3">Client / Network</th>
                      <th className="p-3 pr-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {auditLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      const hasMeta =
                        log.metadata && Object.keys(log.metadata).length > 0;

                      return (
                        <tr
                          key={log.id}
                          className="transition-colors hover:bg-slate-50/50"
                        >
                          <td className="p-3 pl-4 whitespace-nowrap text-slate-500">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">
                                {new Date(log.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            {log.eventType === "LOGIN_SUCCESS" && (
                              <Badge
                                variant="secondary"
                                className="border-emerald-100 bg-emerald-50 font-bold text-emerald-700"
                              >
                                <LogIn className="mr-1 h-3 w-3" /> Login OK
                              </Badge>
                            )}
                            {log.eventType === "LOGIN_FAILURE" && (
                              <Badge
                                variant="destructive"
                                className="font-bold"
                              >
                                <ShieldAlert className="mr-1 h-3 w-3" /> Login Fail
                              </Badge>
                            )}
                            {log.eventType === "LOGOUT" && (
                              <Badge
                                variant="secondary"
                                className="border-slate-200 bg-slate-100 font-bold text-slate-700"
                              >
                                <LogOut className="mr-1 h-3 w-3" /> Logout
                              </Badge>
                            )}
                            {log.eventType === "LOCATION_ALERT" && (
                              <Badge
                                variant="secondary"
                                className="border-amber-200 bg-amber-50 font-bold text-amber-700"
                              >
                                <AlertTriangle className="mr-1 h-3 w-3" /> GPS Alert
                              </Badge>
                            )}
                            {log.eventType === "DEVELOPER_ACTION" && (
                              <Badge
                                variant="secondary"
                                className="border-indigo-100 bg-indigo-50 font-bold text-indigo-700"
                              >
                                <Sliders className="mr-1 h-3 w-3" /> Dev Action
                              </Badge>
                            )}
                            {log.eventType === "SYSTEM_ERROR" && (
                              <Badge
                                variant="destructive"
                                className="font-bold"
                              >
                                <AlertOctagon className="mr-1 h-3 w-3" /> Error
                              </Badge>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">
                                {log.userName ??
                                  (log.employeeCode
                                    ? `Code: ${log.employeeCode}`
                                    : "Unknown / Guest")}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                {log.userRole && (
                                  <span className="font-semibold text-slate-600">
                                    {log.userRole}
                                  </span>
                                )}
                                {log.employeeCode && (
                                  <span>• {log.employeeCode}</span>
                                )}
                                {log.userEmail && (
                                  <span>• {log.userEmail}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">
                                {log.action}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {log.details ?? "No extra details"}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 whitespace-nowrap text-slate-500">
                            <div className="flex flex-col">
                              <span className="font-mono text-[11px] text-slate-700">
                                {log.ipAddress ?? "unknown"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDevice(log.userAgent)}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 pr-4 text-right">
                            {(hasMeta || log.userAgent) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setExpandedLogId(isExpanded ? null : log.id)
                                }
                                className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-800"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Expanded Metadata Drawer */}
            {expandedLogId && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Inspecting Event Metadata & Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedLogId(null)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>
                {(() => {
                  const item = auditLogs?.find((l) => l.id === expandedLogId);
                  if (!item) return null;
                  return (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-slate-600">
                          Full User Agent:{" "}
                        </span>
                        <code className="text-[11px] text-slate-800 break-all">
                          {item.userAgent ?? "None"}
                        </code>
                      </div>
                      {item.metadata && (
                        <div>
                          <span className="font-semibold text-slate-600">
                            Metadata JSON:
                          </span>
                          <pre className="mt-1 overflow-x-auto rounded-lg bg-white p-3 text-[11px] font-mono text-slate-800 shadow-sm">
                            {JSON.stringify(item.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database User Wipeout Area */}
        <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-xl">
          <CardHeader className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-slate-50 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <Trash2 className="h-5 w-5 text-red-500" />
                Permanent Database User Purge
              </CardTitle>
              <CardDescription>
                Completely and permanently delete user records directly from the
                database.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="w-max border-red-200 bg-red-50 text-red-600"
            >
              Extreme Security Hazard
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {isUsersLoading ? (
              <div className="flex justify-center p-12">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold tracking-widest text-slate-500 uppercase">
                      <th className="p-4 pl-6">Employee</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Branch</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 pr-6 text-right font-bold text-red-500">
                        Purge Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {allUsers?.map((u) => (
                      <tr
                        key={u.id}
                        className="transition-colors hover:bg-slate-50/30"
                      >
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-800">
                              {u.firstName} {u.lastName}
                            </span>
                            <span className="text-[10px] font-normal text-slate-400">
                              {u.employeeCode}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">{u.email}</td>
                        <td className="p-4">
                          <Badge
                            variant={
                              u.role === "Developer"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {u.role}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-500">
                          {u.branch?.name ?? "N/A"}
                        </td>
                        <td className="p-4">
                          {u.isActive ? (
                            <Badge
                              variant="secondary"
                              className="border-emerald-100 bg-emerald-50 font-bold text-emerald-700"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 font-bold text-slate-600"
                            >
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
                            disabled={
                              u.role === "Developer" ||
                              deleteAccountMutation.isPending
                            }
                            onClick={() =>
                              handleDeleteUser(
                                u.id,
                                `${u.firstName} ${u.lastName}`,
                              )
                            }
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" /> Purge Account
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
