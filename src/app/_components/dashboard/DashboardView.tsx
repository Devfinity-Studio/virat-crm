"use client";

import React from "react";
import { PageWrapper } from "../layout/PageWrapper";
import { 
  AlertCircle, 
  ArrowRight,
  ShoppingBag,
  Users,
  FileText,
  User,
  MapPin,
  BarChart3,
  Network,
  ShieldCheck,
  Contact,
  Download,
  Upload,
  Sliders,
  Wallet,
  PhoneCall,
  CheckCircle2,
  Navigation,
  Clock,
  Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { FeatureGate } from "../auth/FeatureGate";
import { StatusHeroCard } from "../location/StatusHeroCard";

interface Metric {
  label: string;
  value: string;
  trend: string;
}

interface UserInfo {
  firstName: string;
  lastName?: string | null;
  role: string;
  branchId?: number | null;
  employeeCode?: string | null;
}

interface DashboardViewProps {
  user: UserInfo | null;
  metrics: Metric[];
  isManager: boolean;
  isLoading?: boolean;
}

export function DashboardView({
  user,
  metrics,
  isManager,
  isLoading,
}: DashboardViewProps) {
  const { data: lowStockItems = [] } =
    api.inventory.getLowStockItems.useQuery();

  const { data: rolePermissions, isLoading: permissionsLoading } =
    api.permissions.getForRole.useQuery(
      { role: user?.role ?? "Employee" },
      { enabled: !!user?.role },
    );

  const { data: liveTeam = [] } = api.location.getLiveTeam.useQuery(undefined, {
    enabled: isManager,
    refetchInterval: 30000,
  });

  const getIsFeatureEnabled = (key: string) => {
    if (permissionsLoading) return true;
    if (user?.role === "Developer") return true;
    const p = rolePermissions?.find((p) => p.featureKey === key);
    if (p) return p.isEnabled;
    return user?.role === "Admin";
  };

  const isAdmin = user?.role === "Admin";
  const isEmployee = user?.role === "Employee";
  const onlineAgentsCount = liveTeam.filter(
    (a) => a.tracking.statusBadge === "ONLINE_TRACKING",
  ).length;

  const links = [
    {
      href: "/sales",
      label: "Sales Register",
      icon: ShoppingBag,
      hidden: !getIsFeatureEnabled("sales"),
      iconBg: "bg-blue-600",
    },
    {
      href: "/inventory",
      label: "Inventory",
      icon: FileText,
      hidden: !getIsFeatureEnabled("inventory"),
      iconBg: "bg-indigo-600",
    },
    {
      href: "/crm",
      label: "Customer Master",
      icon: Contact,
      hidden: !getIsFeatureEnabled("crm"),
      iconBg: "bg-purple-600",
    },
    {
      href: "/reports",
      label: "Daily Reports",
      icon: FileText,
      hidden: !getIsFeatureEnabled("reports"),
      iconBg: "bg-emerald-600",
    },
    {
      href: "/reports/mileage",
      label: "Mileage",
      icon: MapPin,
      hidden: !getIsFeatureEnabled("reports"),
      iconBg: "bg-teal-600",
    },
    {
      href: "/reports/advance-register",
      label: "Advance",
      icon: Wallet,
      hidden: !getIsFeatureEnabled("reports"),
      iconBg: "bg-amber-600",
    },
    {
      href: "/reports/replacement-register",
      label: "Replacements",
      icon: FileText,
      hidden: !getIsFeatureEnabled("reports"),
      iconBg: "bg-rose-600",
    },
    {
      href: "/attendance",
      label: "Workforce",
      icon: Users,
      hidden: !getIsFeatureEnabled("attendance"),
      iconBg: "bg-cyan-600",
    },
    {
      href: "/admin/live-map",
      label: "Live Map",
      icon: MapPin,
      hidden: !getIsFeatureEnabled("live-map") && !isAdmin,
      iconBg: "bg-blue-600",
    },
    {
      href: "/admin/reports",
      label: "Analytics",
      icon: BarChart3,
      hidden: !getIsFeatureEnabled("admin-reports") && !isAdmin,
      iconBg: "bg-slate-700",
    },
    {
      href: "/admin/org-chart",
      label: "Org Chart",
      icon: Network,
      hidden: !getIsFeatureEnabled("org-chart") && !isAdmin,
      iconBg: "bg-slate-700",
    },
    {
      href: "/admin/feature-access",
      label: "Access Control",
      icon: ShieldCheck,
      hidden: !isAdmin,
      iconBg: "bg-red-600",
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      hidden: !isAdmin,
      iconBg: "bg-slate-700",
    },
    {
      href: "/admin/exports",
      label: "Exports",
      icon: Download,
      hidden: !isAdmin,
      iconBg: "bg-slate-700",
    },
    {
      href: "/admin/imports",
      label: "Imports",
      icon: Upload,
      hidden: !isAdmin,
      iconBg: "bg-slate-700",
    },
    {
      href: "/admin/developer",
      label: "Dev Console",
      icon: Sliders,
      hidden: user?.role !== "Developer",
      iconBg: "bg-zinc-800",
    },
    { 
      href: "/profile", 
      label: "My Profile", 
      icon: User,
      hidden: false,
      iconBg: "bg-pink-600",
    },
  ];

  return (
    <PageWrapper isLoading={isLoading}>
      <FeatureGate featureKey="dashboard">
        <div className="flex flex-col space-y-6">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Welcome, {user?.firstName}
                </h1>
                {user?.employeeCode && (
                  <span className="rounded-lg bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800 font-mono">
                    {user.employeeCode}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600 font-medium">
                {isEmployee
                  ? "Field agent portal • Your GPS location is tracked for shift mileage."
                  : isManager
                    ? "Manager control deck • Real-time field overview."
                    : "System administration portal."}
              </p>
            </div>
            {isEmployee && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Shift Active
                </span>
              </div>
            )}
          </div>

          {/* Stitch Screen 3: Field Employee Status Hero Card */}
          {isEmployee && (
            <div className="space-y-4">
              <StatusHeroCard
                userName={user?.firstName}
                employeeCode={user?.employeeCode ?? undefined}
                isOnline={true}
                permissionStatus="ALWAYS"
                lastUpdatedText="Just now"
              />

              {/* Today's Shift Info Card */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>GPS Sync</span>
                  </div>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    Every 15 min
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Battery-optimized
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <Navigation className="h-4 w-4 text-emerald-600" />
                    <span>Signal</span>
                  </div>
                  <p className="mt-2 text-lg font-black text-emerald-600">
                    High Accuracy
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Phone GPS Ready
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <Radio className="h-4 w-4 text-purple-600" />
                    <span>Safety Buffer</span>
                  </div>
                  <p className="mt-2 text-lg font-black text-purple-700">
                    22 Min Offline
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Auto-saves without net
                  </p>
                </div>
              </div>

              {/* Big Thumb-Zone Quick Action Cards (56px-72px touch targets) */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Field Quick Actions
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Link href="/crm" className="group">
                    <div className="flex min-h-[72px] items-center gap-4 rounded-2xl border-2 border-blue-200 bg-white p-4 shadow-sm transition-all hover:border-blue-500 active:scale-[0.99]">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-md shadow-blue-500/25">
                        <MapPin className="h-7 w-7" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Record Client Visit
                        </h4>
                        <p className="text-xs font-medium text-slate-500">
                          Log visit note, photos &amp; location
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>

                  <Link href="/reports/field-support/new" className="group">
                    <div className="flex min-h-[72px] items-center gap-4 rounded-2xl border-2 border-emerald-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-500 active:scale-[0.99]">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#16A34A] text-white shadow-md shadow-emerald-500/25">
                        <FileText className="h-7 w-7" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          Submit Daily Report
                        </h4>
                        <p className="text-xs font-medium text-slate-500">
                          Complete end-of-day summary &amp; km
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>

                  <Link href="/sales" className="group">
                    <div className="flex min-h-[72px] items-center gap-4 rounded-2xl border-2 border-purple-200 bg-white p-4 shadow-sm transition-all hover:border-purple-500 active:scale-[0.99]">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/25">
                        <ShoppingBag className="h-7 w-7" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                          Sales &amp; Orders
                        </h4>
                        <p className="text-xs font-medium text-slate-500">
                          Create sales orders and payments
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>

                  <a href="tel:919876543210" className="group">
                    <div className="flex min-h-[72px] items-center gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4 shadow-sm transition-all hover:border-amber-500 active:scale-[0.99]">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-md shadow-amber-500/25">
                        <PhoneCall className="h-7 w-7" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-amber-950 group-hover:text-amber-800 transition-colors">
                          Call Office Dispatcher
                        </h4>
                        <p className="text-xs font-medium text-amber-800">
                          Direct phone hotline for field help
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-amber-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Stitch Screen 5 Promo for Managers & Admins */}
          {isManager && (
            <Link href="/admin/live-map" className="group block">
              <div className="relative overflow-hidden rounded-2xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-5 shadow-sm transition-all hover:border-blue-500 hover:shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-blue-500/30">
                      <MapPin className="h-7 w-7" />
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          {onlineAgentsCount} Agents On Field
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Live GPS
                        </span>
                      </div>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                        Live Field Workforce Map &amp; Route Tracker
                      </h3>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        Inspect live employee coordinates, playback daily routes, and monitor offline lockout alerts.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button className="min-h-[48px] w-full sm:w-auto rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-5">
                      <span>Open Live Map</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Real-time Low Stock Alert Banner */}
          {lowStockItems.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-[#D97706]">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Low Stock Warning
                    </h4>
                    <p className="mt-0.5 text-xs font-medium text-amber-800">
                      {lowStockItems.length}{" "}
                      {lowStockItems.length === 1
                        ? "product is"
                        : "products are"}{" "}
                      running below minimum stock limits. Please restock soon.
                    </p>
                  </div>
                </div>
                <Link href="/inventory" className="shrink-0">
                  <button className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-500/30">
                    Manage Inventory
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Business Metrics Grid (for Managers) */}
          {metrics.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Business Performance
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <Card
                    key={metric.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <CardContent className="p-0">
                      <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                        {metric.label}
                      </p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                          {metric.value}
                        </p>
                        <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {metric.trend}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Feature Navigation Grid (Mobile Quick Launch) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              All Modules &amp; Tools
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {links
                .filter((l) => !l.hidden)
                .map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link href={link.href} key={link.href}>
                      <Card className="group flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-md active:scale-95">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105 ${link.iconBg}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-center text-xs font-bold text-slate-700 group-hover:text-blue-600 line-clamp-1">
                          {link.label}
                        </span>
                      </Card>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      </FeatureGate>
    </PageWrapper>
  );
}
