"use client";

import { api } from "@/trpc/react";
import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import {
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCcw,
  LayoutDashboard,
  ShoppingBag,
  Users,
  MapPin,
  BarChart3,
  FileText,
  Network,
  Contact,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const FEATURES = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Main overview and summary stats",
  },
  {
    key: "sales",
    label: "Sales Register",
    icon: ShoppingBag,
    description: "Log and view sales transactions",
  },
  {
    key: "crm",
    label: "Customer Master",
    icon: Contact,
    description: "Manage customers and financial balances",
  },
  {
    key: "reports",
    label: "Daily Reports",
    icon: FileText,
    description: "Submit and review daily activity narratives",
  },
  {
    key: "workforce",
    label: "Workforce",
    icon: Users,
    description: "Manage employee attendance and leaves",
  },
  {
    key: "field-support",
    label: "Field Support Reports",
    icon: FileText,
    description: "Submit and review field support records",
  },
  {
    key: "live-map",
    label: "Live Field View",
    icon: MapPin,
    description: "Real-time location tracking for managers",
  },
  {
    key: "analytics",
    label: "Intelligence Reports",
    icon: BarChart3,
    description: "Exportable XLSX performance reports",
  },
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
    description: "Staff document storage and viewing",
  },
  {
    key: "org-chart",
    label: "Org Chart",
    icon: Network,
    description: "Visual team hierarchy and reporting lines",
  },
  {
    key: "inventory",
    label: "Inventory & Stock",
    icon: Package,
    description: "Manage products, stock levels, and transfers",
  },
  {
    key: "admin",
    label: "Admin Panel",
    icon: ShieldCheck,
    description: "Manage users, settings, and bulk operations",
  },
];

export default function FeatureAccessPage() {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const { data: rolesData, isLoading: rolesLoading } = api.roles.getAll.useQuery();
  const roles = rolesData?.map(r => r.name) || ["Admin", "Manager", "Employee"];

  const { data: permissions, refetch } = api.permissions.getAll.useQuery();
  const toggleMutation = api.permissions.toggle.useMutation({
    onSuccess: () => {
      void refetch();
      setIsUpdating(null);
    },
  });

  const getPermission = (role: string, featureKey: string) => {
    // If not found, default to enabled for Admins, disabled for others?
    // User request said "enable or disable each and every feature", so let's check if it exists
    const p = permissions?.find(
      (p) => p.role === role && p.featureKey === featureKey,
    );
    if (p) return p.isEnabled;
    return role === "Admin"; // Default: Admins have everything, others don't
  };

  const handleToggle = async (
    role: string,
    featureKey: string,
    currentStatus: boolean,
  ) => {
    const id = `${role}-${featureKey}`;
    setIsUpdating(id);
    await toggleMutation.mutateAsync({
      role,
      featureKey,
      isEnabled: !currentStatus,
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gray-900">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
              <span>Feature Access Control</span>
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              Enable or disable core modules for specific user roles.
            </p>
          </div>
          <button
            onClick={() => {
              void refetch();
            }}
            className="flex w-fit items-center space-x-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition-all hover:bg-gray-200"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Refresh State</span>
          </button>
        </div>

        {/* Matrix Table */}
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="w-1/3 px-8 py-6 text-sm font-bold text-gray-900">
                    Feature Module
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role}
                      className="px-6 py-6 text-center text-sm font-bold text-gray-900"
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {FEATURES.map((feature) => (
                  <tr
                    key={feature.key}
                    className="transition-colors hover:bg-gray-50/30"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-start space-x-4">
                        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                          <feature.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {feature.label}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    {roles.map((role) => {
                      const isEnabled = getPermission(role, feature.key);
                      const id = `${role}-${feature.key}`;
                      const updating = isUpdating === id;

                      return (
                        <td key={role} className="px-6 py-6 text-center">
                          <button
                            onClick={() =>
                              handleToggle(role, feature.key, isEnabled)
                            }
                            disabled={
                              updating ||
                              (role === "Admin" && (feature.key === "dashboard" || feature.key === "admin"))
                            } // Prevent disabling dashboard and admin panel for Admin
                            className={cn(
                              "relative inline-flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                              isEnabled
                                ? "bg-green-500 shadow-sm"
                                : "bg-gray-200",
                              updating && "cursor-wait opacity-50",
                            )}
                          >
                            <span
                              className={cn(
                                "absolute left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white transition-transform duration-300",
                                isEnabled ? "translate-x-6" : "translate-x-0",
                              )}
                            >
                              {updating ? (
                                <RefreshCcw className="h-3 w-3 animate-spin text-gray-400" />
                              ) : isEnabled ? (
                                <Unlock className="h-3 w-3 text-green-600" />
                              ) : (
                                <Lock className="h-3 w-3 text-gray-400" />
                              )}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend / Info */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex items-start space-x-4 rounded-2xl border border-amber-100 bg-amber-50 p-6">
            <Lock className="mt-1 h-6 w-6 text-amber-600" />
            <div>
              <h4 className="font-bold text-amber-900">Security Warning</h4>
              <p className="mt-1 text-sm text-amber-700">
                Disabling a feature will hide it from the sidebar and block its
                core API routes for that specific role. Be careful when
                modifying Admin permissions.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4 rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <RefreshCcw className="mt-1 h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-bold text-blue-900">Instant Activation</h4>
              <p className="mt-1 text-sm text-blue-700">
                Changes take effect immediately. Users may need to refresh their
                browser to see the updated navigation menu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
