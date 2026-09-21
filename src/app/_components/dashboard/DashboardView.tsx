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
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api } from "@/trpc/react";

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
}

interface DashboardViewProps {
  user: UserInfo | null;
  metrics: Metric[];
  isManager: boolean;
  isLoading?: boolean;
}

import { FeatureGate } from "../auth/FeatureGate";

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

  const getIsFeatureEnabled = (key: string) => {
    if (permissionsLoading) return true; // Show while loading
    if (user?.role === "Developer") return true;
    
    // Developer disabled features (if any property exists for it in the future)
    // if (user?.disabledFeaturesGlobal?.includes(key)) return false;

    const p = rolePermissions?.find((p) => p.featureKey === key);
    if (p) return p.isEnabled;
    return user?.role === "Admin"; // Admins get everything by default
  };

  const isAdmin = user?.role === "Admin";

  const links = [
    {
      href: "/sales",
      label: "Sales Register",
      icon: ShoppingBag,
      hidden: !getIsFeatureEnabled("sales"),
      color: "bg-blue-50 text-blue-600",
      iconBg: "bg-blue-500",
      borderColor: "border-blue-200"
    },
    {
      href: "/inventory",
      label: "Inventory",
      icon: FileText,
      hidden: !getIsFeatureEnabled("inventory"),
      color: "bg-indigo-50 text-indigo-600",
      iconBg: "bg-indigo-500",
      borderColor: "border-indigo-200"
    },
    {
      href: "/crm",
      label: "Customer Master",
      icon: Contact,
      hidden: !getIsFeatureEnabled("crm"),
      color: "bg-purple-50 text-purple-600",
      iconBg: "bg-purple-500",
      borderColor: "border-purple-200"
    },
    {
      href: "/reports",
      label: "Daily Reports",
      icon: FileText,
      hidden: !getIsFeatureEnabled("reports"),
      color: "bg-emerald-50 text-emerald-600",
      iconBg: "bg-emerald-500",
      borderColor: "border-emerald-200"
    },
    {
      href: "/reports/mileage",
      label: "Mileage",
      icon: MapPin,
      hidden: !getIsFeatureEnabled("reports"),
      color: "bg-teal-50 text-teal-600",
      iconBg: "bg-teal-500",
      borderColor: "border-teal-200"
    },
    {
      href: "/reports/advance-register",
      label: "Advance",
      icon: Wallet,
      hidden: !getIsFeatureEnabled("reports"),
      color: "bg-orange-50 text-orange-600",
      iconBg: "bg-orange-500",
      borderColor: "border-orange-200"
    },
    {
      href: "/reports/replacement-register",
      label: "Replacements",
      icon: FileText,
      hidden: !getIsFeatureEnabled("reports"),
      color: "bg-rose-50 text-rose-600",
      iconBg: "bg-rose-500",
      borderColor: "border-rose-200"
    },
    {
      href: "/attendance",
      label: "Workforce",
      icon: Users,
      hidden: !getIsFeatureEnabled("attendance"),
      color: "bg-cyan-50 text-cyan-600",
      iconBg: "bg-cyan-500",
      borderColor: "border-cyan-200"
    },
    {
      href: "/admin/live-map",
      label: "Live Map",
      icon: MapPin,
      hidden: !getIsFeatureEnabled("live-map") && !isAdmin,
      color: "bg-slate-100 text-slate-700",
      iconBg: "bg-slate-500",
      borderColor: "border-slate-300"
    },
    {
      href: "/admin/reports",
      label: "Analytics",
      icon: BarChart3,
      hidden: !getIsFeatureEnabled("admin-reports") && !isAdmin,
      color: "bg-slate-100 text-slate-700",
      iconBg: "bg-slate-500",
      borderColor: "border-slate-300"
    },
    {
      href: "/admin/org-chart",
      label: "Org Chart",
      icon: Network,
      hidden: !getIsFeatureEnabled("org-chart") && !isAdmin,
      color: "bg-slate-100 text-slate-700",
      iconBg: "bg-slate-500",
      borderColor: "border-slate-300"
    },
    {
      href: "/admin/feature-access",
      label: "Access Control",
      icon: ShieldCheck,
      hidden: !isAdmin,
      color: "bg-red-50 text-red-600",
      iconBg: "bg-red-500",
      borderColor: "border-red-200"
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      hidden: !isAdmin,
      color: "bg-slate-100 text-slate-700",
      iconBg: "bg-slate-500",
      borderColor: "border-slate-300"
    },
    {
      href: "/admin/exports",
      label: "Exports",
      icon: Download,
      hidden: !isAdmin,
      color: "bg-slate-100 text-slate-700",
      iconBg: "bg-slate-500",
      borderColor: "border-slate-300"
    },
    {
      href: "/admin/imports",
      label: "Imports",
      icon: Upload,
      hidden: !isAdmin,
      color: "bg-slate-100 text-slate-700",
      iconBg: "bg-slate-500",
      borderColor: "border-slate-300"
    },
    {
      href: "/admin/developer",
      label: "Dev Console",
      icon: Sliders,
      hidden: user?.role !== "Developer",
      color: "bg-zinc-800 text-zinc-100",
      iconBg: "bg-zinc-500",
      borderColor: "border-zinc-700"
    },
    { 
      href: "/profile", 
      label: "My Profile", 
      icon: User,
      hidden: false,
      color: "bg-pink-50 text-pink-600",
      iconBg: "bg-pink-500",
      borderColor: "border-pink-200"
    },
  ];

  return (
    <PageWrapper isLoading={isLoading}>
      <FeatureGate featureKey="dashboard">
        <div className="flex flex-col space-y-8">
          <div>
            <div className="flex items-center gap-3">
              <img src="/androidLogo.png" alt="Virat Bio Plaantec Logo" className="w-10 h-10 object-contain md:hidden" />
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Virat Dashboard
              </h1>
            </div>
            <p className="mt-1 text-slate-500">
              Welcome back,{" "}
              <span className="font-semibold text-slate-700">
                {user?.firstName}
              </span>
              .
              {isManager
                ? " Here's your business at a glance."
                : " Have a productive day!"}
            </p>
          </div>

          {/* Real-time Premium Low Stock Alert Banner */}
          {lowStockItems.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-4 relative overflow-hidden rounded-2xl border border-amber-200/60 bg-amber-50/50 p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-amber-950/10">
              {/* Background Glow */}
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500">
                    <AlertCircle className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-400">
                      Attention: Low Stock Warning
                    </h4>
                    <p className="mt-0.5 text-xs leading-relaxed text-amber-700/85 dark:text-amber-500/90">
                      {lowStockItems.length}{" "}
                      {lowStockItems.length === 1
                        ? "product is"
                        : "products are"}{" "}
                      running below minimum stock limits. Please review and
                      restock immediately.
                    </p>
                  </div>
                </div>
                <Link href="/inventory" className="shrink-0">
                  <button className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 px-4.5 py-2 text-xs font-bold text-amber-700 transition-all duration-300 hover:bg-amber-500/20 hover:text-amber-900 dark:text-amber-400">
                    Manage Inventory
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <Card
                key={metric.label}
                className="rounded-xl border-none p-0 shadow-sm transition-transform duration-300 bg-slate-100 dark:bg-slate-800"
              >
                <CardContent className="p-6">
                  <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    {metric.label}
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-3xl font-bold text-slate-900">
                      {metric.value}
                    </p>
                    <span className="bg-primary/10 text-primary rounded-lg px-2.5 py-1 text-[11px] font-bold">
                      {metric.trend}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature Navigation Grid (Mobile Only) */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:hidden">
            {links
              .filter((l) => !l.hidden)
              .map((link) => {
                const Icon = link.icon;
                return (
                  <Link href={link.href} key={link.href}>
                    <Card className={`group flex h-36 flex-col items-center justify-center gap-3 rounded-2xl border-none transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 bg-white shadow-sm ring-1 ring-slate-100`}>
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm text-white ${link.iconBg}`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <span className="text-center text-sm font-bold tracking-tight text-slate-700 group-hover:text-slate-900 px-2 line-clamp-1">
                        {link.label}
                      </span>
                    </Card>
                  </Link>
                );
              })}
          </div>

          {/* Desktop Dashboard View (Desktop Only) */}
          <div className="hidden md:grid gap-6 md:grid-cols-7">
            <Card className="rounded-xl border-none shadow-sm md:col-span-4">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-800">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="group -mx-2 flex cursor-pointer items-center gap-4 border-b border-slate-100 py-2 px-3 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] odd:bg-white even:bg-slate-100 dark:border-slate-800 dark:odd:bg-slate-900 dark:even:bg-slate-800"
                    >
                      <div className="text-primary group-hover:bg-primary flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 font-bold shadow-sm transition-all duration-300 group-hover:text-white">
                        {i}
                      </div>
                      <div className="flex-1">
                        <p className="group-hover:text-primary font-semibold text-slate-800 transition-colors">
                          Sale Approved - ORD-{1000 + i}
                        </p>
                        <p className="text-xs text-slate-400">
                          2 hours ago • Verified by Admin
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-600 to-emerald-700 flex flex-col items-center justify-center rounded-2xl border-none p-8 text-center shadow-lg md:col-span-3">
              <div className="shadow-premium mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 transition-transform hover:scale-110 backdrop-blur-sm">
                <Plus className="text-white h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Quick Actions
              </h3>
              <p className="mb-6 max-w-[220px] text-sm text-green-50 font-medium mt-1">
                Create new sales, documents or manage workforce instantly.
              </p>
              <Link href="/sales/new" className="w-full">
                <Button size="lg" className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-md shadow-md border-0">
                  New Sale
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </FeatureGate>
    </PageWrapper>
  );
}
