"use client";

import { api } from "@/trpc/react";
import { useState } from "react";
import { Download, RefreshCw, Car } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export function MileageReportList({ isManager, isAdmin }: { isManager: boolean, isAdmin?: boolean }) {
  const [preset, setPreset] = useState<
    "today" | "7d" | "30d" | "quarter" | "year" | "all"
  >("30d");
  const [scope, setScope] = useState<
    "individual" | "team" | "management" | "branch"
  >(isManager || isAdmin ? "management" : "individual");
  const [branchId, setBranchId] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<string>("");

  const { data: selectableUsers } = api.reports.getSelectableUsers.useQuery(undefined, {
    enabled: isManager || isAdmin,
  });

  const { data: branches } = api.users.getPublicBranches.useQuery(undefined, {
    enabled: isAdmin,
  });

  const { data, isLoading, refetch } = api.reports.getMileageReport.useQuery({
    preset,
    scope: isManager || isAdmin ? scope : "individual",
    targetId: targetUserId ? targetUserId : undefined,
    branchId: scope === "branch" && branchId ? parseInt(branchId) : undefined,
  });

  const handleExportCSV = () => {
    if (!data || data.records.length === 0) return;

    const headers = [
      "Date",
      "Employee Code",
      "Employee Name",
      "Distance (km)",
      "Valid Points",
    ];

    const csvContent = [
      headers.join(","),
      ...data.records.map((r) =>
        [
          r.date,
          r.employeeCode,
          `"${r.userName}"`,
          r.totalDistanceKm,
          r.validPointsCount,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `mileage_report_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={preset} onValueChange={(val: any) => setPreset(val)}>
            <SelectTrigger className="w-[140px] rounded-xl border-slate-200 bg-white shadow-sm">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          {(isManager || isAdmin) && (
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={scope}
                onValueChange={(val: any) => {
                  setScope(val);
                  if (val !== "branch") setBranchId("");
                  if (val === "individual") setTargetUserId("");
                }}
              >
                <SelectTrigger className="w-[160px] rounded-xl border-slate-200 bg-white shadow-sm font-semibold">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">My Mileage</SelectItem>
                  <SelectItem value="team">Direct Team</SelectItem>
                  <SelectItem value="management">Team Hierarchy</SelectItem>
                  {isAdmin && <SelectItem value="branch">Branch Reports</SelectItem>}
                </SelectContent>
              </Select>

              {/* Target User Selector for Admins or Managers viewing team */}
              {(isAdmin || (isManager && scope !== "individual")) && selectableUsers && selectableUsers.length > 0 && (
                <Select
                  value={targetUserId}
                  onValueChange={(val) => setTargetUserId(val === "all" ? "" : val)}
                >
                  <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white shadow-sm font-medium">
                    <SelectValue placeholder="All Members" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">All Members</SelectItem>
                    {selectableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {scope === "branch" && isAdmin && (
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white shadow-sm font-medium">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <button
            onClick={() => void refetch()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600 active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={!data || data.records.length === 0}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-white/50 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Total Mileage</h3>
              <p className="text-2xl font-black tracking-tight text-blue-600">
                {data?.totalKm ?? 0}{" "}
                <span className="text-sm font-medium text-slate-500">km</span>
              </p>
            </div>
          </div>

          {data?.records.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No mileage logs found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4 text-right">Distance (km)</th>
                    <th className="px-6 py-4 text-right">Data Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.records.map((r) => (
                    <tr
                      key={r.id}
                      className="transition-colors odd:bg-white even:bg-slate-100 hover:bg-slate-200/50"
                    >
                      <td className="px-6 py-4 font-medium whitespace-nowrap text-slate-900">
                        {r.date}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                            {r.userName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {r.userName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {r.employeeCode}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black tracking-tight whitespace-nowrap text-blue-600">
                        {r.totalDistanceKm}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {r.validPointsCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
