"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, FileText, User, Map, Users, LayoutDashboard, Bell } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  // Hide BottomNav on login and auth pages
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname?.startsWith("/api") ||
    pathname === "/privacy-policy" ||
    pathname === "/terms-of-service"
  ) {
    return null;
  }

  return <BottomNavContent pathname={pathname} />;
}

function BottomNavContent({ pathname }: { pathname: string }) {
  const { data: user } = api.users.getMe.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: unreadAlerts } = api.location.getAdminAlerts.useQuery(
    { limit: 20 },
    {
      enabled: user?.role === "Admin" || user?.role === "Developer",
      refetchInterval: 30_000,
    },
  );

  const unreadCount = unreadAlerts?.filter((a) => !a.isRead).length ?? 0;

  const isAdmin = user?.role === "Admin" || user?.role === "Developer";

  // Role-Aware Navigation Tabs (Maximum 4 items per UX rule)
  const tabs = isAdmin
    ? [
        {
          label: "Live Map",
          href: "/admin/live-map",
          icon: Map,
          badge: null,
          isActive: pathname === "/admin/live-map",
        },
        {
          label: "Team",
          href: "/admin/users",
          icon: Users,
          badge: null,
          isActive: pathname.startsWith("/admin/users"),
        },
        {
          label: "Overview",
          href: "/",
          icon: LayoutDashboard,
          badge: null,
          isActive: pathname === "/",
        },
        {
          label: "Alerts",
          href: "/admin/live-map#alerts",
          icon: Bell,
          badge: unreadCount > 0 ? unreadCount : null,
          isActive: pathname.includes("alert"),
        },
      ]
    : [
        {
          label: "Home",
          href: "/",
          icon: Home,
          badge: null,
          isActive: pathname === "/",
        },
        {
          label: "Visits",
          href: "/crm",
          icon: MapPin,
          badge: null,
          isActive: pathname.startsWith("/crm"),
        },
        {
          label: "Reports",
          href: "/reports",
          icon: FileText,
          badge: null,
          isActive: pathname.startsWith("/reports"),
        },
        {
          label: "Profile",
          href: "/profile",
          icon: User,
          badge: null,
          isActive: pathname.startsWith("/profile"),
        },
      ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md select-none transition-all"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))",
      }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "group relative flex min-h-[52px] flex-1 flex-col items-center justify-center rounded-xl py-1 px-1 transition-all active:scale-95",
                tab.isActive
                  ? "text-blue-600 font-bold"
                  : "text-slate-500 hover:text-slate-900 font-medium",
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-6 w-6 transition-transform group-hover:scale-105",
                    tab.isActive ? "text-blue-600 stroke-[2.4]" : "text-slate-500",
                  )}
                />
                {tab.badge !== null && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-xs">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "mt-1 text-[11px] leading-tight tracking-tight",
                  tab.isActive ? "text-blue-600 font-bold" : "text-slate-600",
                )}
              >
                {tab.label}
              </span>
              {tab.isActive && (
                <span className="absolute bottom-0 h-1 w-8 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
