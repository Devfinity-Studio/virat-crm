"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, Loader2, Info } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    data: notifications = [],
    refetch,
    isLoading,
  } = api.notifications.getMyNotifications.useQuery(undefined, {
    refetchInterval: 15000, // Poll every 15 seconds for real-time feel
  });

  const markAsRead = api.notifications.markAsRead.useMutation({
    onSuccess: () => void refetch(),
  });

  const markAllAsRead = api.notifications.markAllAsRead.useMutation({
    onSuccess: () => void refetch(),
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const unreadCount = unreadNotifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "focus:ring-primary/20 relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 focus:ring-2 focus:outline-none",
          isOpen
            ? "bg-primary/10 text-primary shadow-inner"
            : "bg-slate-50 text-slate-600 hover:bg-slate-100",
        )}
      >
        <Bell
          className={cn(
            "h-5 w-5 transition-transform duration-500",
            unreadCount > 0 && "animate-wiggle",
          )}
        />

        {/* Glow & Badge */}
        {unreadCount > 0 && (
          <>
            <span
              className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 animate-pulse items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-lg ring-2 ring-white"
              style={{ animationDuration: "1.5s" }}
            >
              {unreadCount}
            </span>
            <span
              className="absolute top-1.5 right-1.5 h-3.5 w-3.5 animate-ping rounded-full bg-red-400 opacity-75 ring-2 ring-white"
              style={{ animationDuration: "2s" }}
            />
          </>
        )}
      </button>

      {/* Styled Dropdown Panel */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute right-0 z-50 mt-3 w-80 origin-top-right transform overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-2xl backdrop-blur-xl transition-all duration-300 sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Notifications
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread alerts`
                  : "No unread alerts"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="text-primary hover:text-primary-hover flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {markAllAsRead.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    Mark all read
                  </>
                )}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="no-scrollbar max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <span className="mt-3 text-xs font-medium">
                  Fetching alerts...
                </span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 shadow-sm">
                  <Bell className="h-6 w-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-semibold text-slate-700">
                  All caught up!
                </h4>
                <p className="mt-1 max-w-[240px] text-xs text-slate-500">
                  You have no notifications or low-stock alerts at this moment.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead.mutate({ notificationId: notification.id });
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer gap-3 px-5 py-4 transition-all duration-200 hover:bg-slate-50/60",
                    !notification.isRead
                      ? "bg-slate-50/30 font-medium"
                      : "opacity-75",
                  )}
                >
                  <div className="mt-0.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl border",
                        !notification.isRead
                          ? "border-amber-200 bg-amber-50 text-amber-600"
                          : "border-slate-200 bg-slate-50 text-slate-500",
                      )}
                    >
                      <Info className="h-4.5 w-4.5" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-xs font-semibold",
                          !notification.isRead
                            ? "text-slate-800"
                            : "text-slate-600",
                        )}
                      >
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[9px] font-medium text-slate-400">
                        {new Date(notification.createdAt).toLocaleTimeString(
                          [],
                          { hour: "numeric", minute: "2-digit" },
                        )}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-xs leading-relaxed break-words",
                        !notification.isRead
                          ? "text-slate-600"
                          : "text-slate-500",
                      )}
                    >
                      {notification.message}
                    </p>
                  </div>

                  {!notification.isRead && (
                    <div className="flex shrink-0 items-center">
                      <span className="bg-primary h-2 w-2 rounded-full" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
