"use client";

import { Home, LogOut, Menu } from "lucide-react";
import { DesktopSidebar } from "./DesktopSidebar";
import { useSyncManager } from "@/hooks/use-sync-manager";
import { useLocationBreadcrumbs } from "@/hooks/use-location-breadcrumbs";
import { RefreshCcw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "../ErrorBoundary";
import { api } from "@/trpc/react";
import { SuspendedView } from "../dashboard/SuspendedView";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "../notifications/NotificationBell";
import { AlertTriangle, X } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSyncing, pendingCount } = useSyncManager();
  const pathname = usePathname();
  const router = useRouter();
  useLocationBreadcrumbs();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const { error } = api.users.getMe.useQuery(undefined, {
    retry: false,
  });

  const { data: notifications = [], refetch } =
    api.notifications.getMyNotifications.useQuery(undefined, {
      refetchInterval: 15000,
    });
  const markAsRead = api.notifications.markAsRead.useMutation({
    onSuccess: () => void refetch(),
  });

  const isSystemLocked = error?.message?.includes("SYSTEM_LOCKED");

  const unreadLowStockAlert = notifications.find(
    (n) => !n.isRead && n.title.includes("Low Stock"),
  );

  if (isSystemLocked) {
    return <SuspendedView />;
  }

  const getPageTitle = (path: string) => {
    if (path === "/") return (
      <>
        <span className="hidden md:inline">Dashboard Overview</span>
        <img src="/logo-removebg-preview.png" alt="Virat Bio Plaantec Logo" className="h-8 object-contain md:hidden" />
      </>
    );
    if (path.startsWith("/sales")) return "Sales Register";
    if (path.startsWith("/inventory")) return "Inventory & Stock";
    if (path.startsWith("/crm")) return "Customer Master";
    if (path.startsWith("/reports")) return "Daily Activity Reports";
    if (path.startsWith("/attendance")) return "Workforce Management";
    if (path.startsWith("/admin/live-map")) return "Live Field View";
    if (path.startsWith("/admin/reports")) return "Intelligence & Analytics";
    if (path.startsWith("/admin/org-chart")) return "Organization Structure";
    if (path.startsWith("/documents")) return "Document Repository";
    if (path.startsWith("/admin/feature-access"))
      return "Feature Access Control";
    if (path.startsWith("/admin/users")) return "User & Agent Management";
    if (path.startsWith("/admin/exports")) return "Bulk Data Export";
    if (path.startsWith("/admin/imports")) return "Bulk Data Import";
    if (path.startsWith("/admin/developer")) return "Developer Sandbox Console";
    if (path.startsWith("/profile")) return "User Profile Settings";
    return "Virat CRM Portal";
  };

  return (
    <div className="text-foreground flex min-h-screen bg-emerald-50/30 dark:bg-slate-950">
      <DesktopSidebar />
      <div className="flex w-full flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,16px))] md:pb-0">
        {(pendingCount > 0 || isSyncing) && (
          <div
            className={cn(
              "flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold tracking-widest text-white uppercase transition-colors",
              isSyncing ? "bg-blue-600" : "bg-orange-500",
            )}
          >
            {isSyncing ? (
              <>
                <RefreshCcw className="h-3 w-3 animate-spin" />
                Syncing {pendingCount} Items...
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline: {pendingCount} Pending Sync
              </>
            )}
          </div>
        )}

        {unreadLowStockAlert && (
          <div className="animate-in slide-in-from-top-2 z-50 flex items-center justify-between border-b border-red-100 bg-red-50 px-6 py-3 shadow-sm dark:border-red-900 dark:bg-red-950/40">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-1.5 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {unreadLowStockAlert.title}
                </span>
                <span className="text-xs text-red-600 dark:text-red-300">
                  {unreadLowStockAlert.message}
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                markAsRead.mutate({ notificationId: unreadLowStockAlert.id })
              }
              className="flex items-center gap-1.5 rounded-md bg-red-100/50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200/50 hover:text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-800/50 dark:hover:text-red-100"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        )}

        {/* Native Top Navigation Header */}
        <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-slate-200 bg-white px-4 pt-[env(safe-area-inset-top)] shadow-sm md:border-transparent md:bg-gradient-to-r md:from-green-600 md:via-emerald-500 md:to-orange-500 md:h-16 md:px-8 dark:border-slate-800 dark:bg-slate-950 md:dark:from-green-900 md:dark:via-emerald-900 md:dark:to-orange-900">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/")}
              className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 md:bg-white/20 md:text-white transition-colors md:hover:bg-white/30 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Home className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 shadow-none md:text-white md:shadow-sm dark:text-slate-100">
              {getPageTitle(pathname)}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="flex items-center justify-center rounded-xl p-2 text-slate-700 hover:bg-red-50 hover:text-red-600 md:bg-white/20 md:text-white md:hover:bg-red-500 transition-colors dark:text-slate-300 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className={cn(
          "flex-1 p-4 md:p-6 lg:p-8 transition-colors",
          pathname === "/" ? "bg-gradient-to-br from-green-100/50 via-emerald-100/50 to-orange-100/50 md:bg-none dark:from-green-950/40 dark:via-emerald-950/40 dark:to-orange-950/40" : ""
        )}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
