"use client";

import { FeatureGate } from "@/app/_components/auth/FeatureGate";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import {
  BarChart3,
  Download,
  Users,
  User as UserIcon,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateSalesXLSX, generateAttendanceXLSX } from "@/lib/excel";
import { generateSalesPDF, generateAttendancePDF } from "@/lib/pdf";
import { type LucideIcon } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "recharts";

interface YearlyStat {
  year: number;
  revenue: number;
  orders: number;
  visits: number;
}

const PRESETS = [
  { value: "today", label: "Daily" },
  { value: "30d", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year", label: "Yearly" },
  { value: "all", label: "Lifetime" },
] as const;

const SCOPES = [
  { value: "individual", label: "Individual", icon: UserIcon },
  { value: "team", label: "Immediate Team", icon: Users },
  { value: "management", label: "Full Subtree", icon: Layers },
] as const;

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-gray-100 bg-gray-50">
            <div className="text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="animate-pulse text-xs font-medium text-gray-500">
                Loading reports context...
              </p>
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const initialUserId = searchParams ? searchParams.get("userId") : null;

  const [activeTab, setActiveTab] = useState<"overview" | "predictive">(
    "overview",
  );
  const [preset, setPreset] = useState<
    "today" | "7d" | "30d" | "quarter" | "year" | "all"
  >("30d");
  const [scope, setScope] = useState<
    "individual" | "team" | "management" | "branch"
  >("individual");
  const [targetId, setTargetId] = useState<string | null>(initialUserId);
  const [previewTab, setPreviewTab] = useState<"sales" | "location">("sales");

  const { data: selectableUsers } = api.reports.getSelectableUsers.useQuery();
  const { data: reportData, isLoading } = api.reports.getReportData.useQuery(
    {
      preset,
      scope,
      targetId: targetId ?? undefined,
    },
    { enabled: !!scope },
  );

  const { data: forecastData, isLoading: isForecastLoading } =
    api.reports.getSalesForecast.useQuery(
      {
        scope: scope === "branch" ? "individual" : scope,
        targetId: targetId ?? undefined,
      },
      { enabled: activeTab === "predictive" },
    );

  const utils = api.useUtils();
  const seedMutation = api.reports.seedFakeLocationLogs.useMutation({
    onSuccess: async () => {
      await utils.reports.getReportData.invalidate();
      alert("Fake location logs seeded successfully!");
    },
  });

  const handleDownloadSales = async () => {
    if (!reportData?.sales) return;
    const filename = `Sales_Report_${scope}_${preset}_${new Date().toISOString().split("T")[0]}`;
    await generateSalesXLSX(reportData.sales, filename);
  };

  const handleDownloadSalesPDF = () => {
    if (!reportData?.sales) return;
    const filename = `Sales_Report_${scope}_${preset}_${new Date().toISOString().split("T")[0]}`;
    generateSalesPDF(reportData.sales, filename);
  };

  const handleDownloadAttendance = async () => {
    if (!reportData?.attendance) return;
    const filename = `Attendance_Report_${scope}_${preset}_${new Date().toISOString().split("T")[0]}`;
    await generateAttendanceXLSX(reportData.attendance, filename);
  };

  const handleDownloadAttendancePDF = () => {
    if (!reportData?.attendance) return;
    const filename = `Attendance_Report_${scope}_${preset}_${new Date().toISOString().split("T")[0]}`;
    generateAttendancePDF(reportData.attendance, filename);
  };

  return (
    <DashboardLayout>
      <FeatureGate featureKey="reports">
        <div className="flex flex-col space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Intelligence Reports
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              Generate and export deep-dive performance insights.
            </p>
          </div>

          {/* Tabs switcher */}
          <div className="flex space-x-2 border-b border-gray-100 pb-px">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "relative border-b-2 px-4 pb-4 text-sm font-semibold transition-all",
                activeTab === "overview"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600",
              )}
            >
              Performance Overview
            </button>
            <button
              onClick={() => setActiveTab("predictive")}
              className={cn(
                "relative flex items-center space-x-2 border-b-2 px-4 pb-4 text-sm font-semibold transition-all",
                activeTab === "predictive"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600",
              )}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Predictive Forecasting</span>
              <span className="ml-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                Beta
              </span>
            </button>
          </div>

          {activeTab === "predictive" ? (
            <div className="animate-in fade-in flex flex-col space-y-8 duration-300">
              {/* Configuration (just Scope & Target) */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Scope Selection */}
                <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center space-x-2 font-semibold text-purple-600">
                    <Layers className="h-5 w-5" />
                    <span>Reporting Scope</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SCOPES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setScope(s.value)}
                        className={cn(
                          "flex items-center space-x-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                          scope === s.value
                            ? "bg-purple-600 text-white shadow-md shadow-purple-100"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100",
                        )}
                      >
                        <s.icon className="h-4 w-4" />
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Selection */}
                <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center space-x-2 font-semibold text-green-600">
                    <Users className="h-5 w-5" />
                    <span>Target Entity</span>
                  </div>
                  <TargetUserSelect
                    targetId={targetId}
                    setTargetId={setTargetId}
                    selectableUsers={selectableUsers}
                  />
                </div>
              </div>

              {/* Projections Stats */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <StatCard
                  title="Forecasted Next Month"
                  value={
                    isForecastLoading
                      ? "Analyzing..."
                      : `â‚¹${forecastData?.stats.nextMonthRevenue.toLocaleString() ?? "0"}`
                  }
                  icon={TrendingUp}
                  color="blue"
                />
                <StatCard
                  title="Historical Monthly Trend"
                  value={
                    isForecastLoading
                      ? "Analyzing..."
                      : `${(forecastData?.stats.trend ?? 0) >= 0 ? "+" : ""}${forecastData?.stats.trend ?? 0}%`
                  }
                  icon={BarChart3}
                  color="purple"
                />
                <StatCard
                  title="Prediction Confidence"
                  value={
                    isForecastLoading
                      ? "Analyzing..."
                      : `${forecastData?.stats.confidence ?? 50}% RÂ² Score`
                  }
                  icon={CheckCircle2}
                  color="green"
                />
              </div>

              {/* Sales Forecast Chart */}
              <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                <div>
                  <h3 className="flex items-center space-x-2 text-xl font-bold text-gray-900">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                    <span>Sales Trend & Projection Curve</span>
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    12-Month Trailing Historical Sales (Solid) vs 3-Month Future
                    Projections (Dotted).
                  </p>
                </div>

                <div className="h-[400px] w-full pt-4">
                  {isForecastLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        <p className="text-xs font-medium text-gray-500">
                          Running time-series projection algorithms...
                        </p>
                      </div>
                    </div>
                  ) : !forecastData ||
                    (forecastData.history.length === 0 &&
                      forecastData.forecast.length === 0) ? (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      No sales data available for projection in this scope.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          ...forecastData.history.map((h, idx) => ({
                            period: h.period,
                            Actual: h.revenue,
                            Forecast:
                              idx === forecastData.history.length - 1
                                ? h.revenue
                                : null,
                            Optimistic:
                              idx === forecastData.history.length - 1
                                ? h.revenue
                                : null,
                            Pessimistic:
                              idx === forecastData.history.length - 1
                                ? h.revenue
                                : null,
                          })),
                          ...forecastData.forecast.map((f) => ({
                            period: f.period,
                            Actual: null,
                            Forecast: f.revenue,
                            Optimistic: f.optimistic,
                            Pessimistic: f.pessimistic,
                          })),
                        ]}
                        margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="period"
                          stroke="#94a3b8"
                          fontSize={11}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickFormatter={(v) =>
                            `â‚¹${v >= 1000 ? v / 1000 + "k" : v}`
                          }
                        />
                        <ChartTooltip
                          formatter={(value: unknown, name: unknown) => {
                            const numVal =
                              typeof value === "number" ||
                              typeof value === "string"
                                ? Number(value)
                                : null;
                            return [
                              numVal ? `â‚¹${numVal.toLocaleString()}` : "N/A",
                              String(name),
                            ];
                          }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderRadius: "16px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
                          }}
                        />
                        <ChartLegend
                          wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Actual"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 1 }}
                          activeDot={{ r: 6 }}
                          name="Actual Sales"
                        />
                        <Line
                          type="monotone"
                          dataKey="Forecast"
                          stroke="#4f46e5"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{ r: 4, strokeWidth: 1 }}
                          name="Projected Forecast"
                        />
                        <Line
                          type="monotone"
                          dataKey="Optimistic"
                          stroke="#10b981"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          dot={false}
                          name="Optimistic (+95%)"
                        />
                        <Line
                          type="monotone"
                          dataKey="Pessimistic"
                          stroke="#f43f5e"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          dot={false}
                          name="Pessimistic (-95%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Projections breakdown list */}
              <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-50 bg-gray-50/50 p-6">
                  <h3 className="flex items-center space-x-2 font-bold text-gray-900">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                    <span>Forecast Projection Range Breakdown</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-bold tracking-wider text-gray-500 uppercase">
                      <tr>
                        <th className="px-6 py-4">Projection Period</th>
                        <th className="px-6 py-4">Pessimistic Lower Bound</th>
                        <th className="px-6 py-4">Expected Forecast</th>
                        <th className="px-6 py-4">Optimistic Upper Bound</th>
                        <th className="px-6 py-4">Accuracy Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {isForecastLoading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-8 text-center text-gray-400"
                          >
                            Loading forecast table...
                          </td>
                        </tr>
                      ) : !forecastData ||
                        forecastData.forecast.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-8 text-center text-gray-400"
                          >
                            No projections available.
                          </td>
                        </tr>
                      ) : (
                        forecastData.forecast.map((f, idx) => (
                          <tr
                            key={f.period}
                            className="transition-colors hover:bg-gray-50/50"
                          >
                            <td className="px-6 py-4 font-semibold text-gray-900">
                              {f.period}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-red-600">
                              â‚¹{f.pessimistic.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                              â‚¹{f.revenue.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-green-600">
                              â‚¹{f.optimistic.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase",
                                  idx === 0
                                    ? "bg-green-100 text-green-700"
                                    : idx === 1
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-orange-100 text-orange-700",
                                )}
                              >
                                {idx === 0
                                  ? "High Confidence"
                                  : idx === 1
                                    ? "Moderate"
                                    : "Speculative"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Configuration Grid */}
              <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Timeframe Selection */}
                <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center space-x-2 font-semibold text-blue-600">
                    <Calendar className="h-5 w-5" />
                    <span>Timeframe</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPreset(p.value)}
                        className={cn(
                          "rounded-xl px-4 py-2 text-sm font-medium transition-all",
                          preset === p.value
                            ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scope Selection */}
                <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center space-x-2 font-semibold text-purple-600">
                    <Layers className="h-5 w-5" />
                    <span>Reporting Scope</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SCOPES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setScope(s.value)}
                        className={cn(
                          "flex items-center space-x-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                          scope === s.value
                            ? "bg-purple-600 text-white shadow-md shadow-purple-100"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100",
                        )}
                      >
                        <s.icon className="h-4 w-4" />
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Selection */}
                <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center space-x-2 font-semibold text-green-600">
                    <Users className="h-5 w-5" />
                    <span>Target Entity</span>
                  </div>
                  <TargetUserSelect
                    targetId={targetId}
                    setTargetId={setTargetId}
                    selectableUsers={selectableUsers}
                  />
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Revenue"
                  value={`â‚¹${reportData?.summary.revenue.toLocaleString() ?? "0"}`}
                  icon={TrendingUp}
                  color="blue"
                />
                <StatCard
                  title="Pending Balance"
                  value={`â‚¹${reportData?.summary.balance.toLocaleString() ?? "0"}`}
                  icon={Wallet}
                  color="red"
                />
                <StatCard
                  title="Approved Orders"
                  value={reportData?.summary.orders ?? 0}
                  icon={CheckCircle2}
                  color="green"
                />
                <StatCard
                  title="Field Visits"
                  value={reportData?.summary.visits ?? 0}
                  icon={Clock}
                  color="purple"
                />
              </div>

              {/* Yearly Summary (for Lifetime) */}
              {preset === "all" &&
                reportData?.yearlyStats &&
                reportData.yearlyStats.length > 0 && (
                  <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                    <h3 className="flex items-center space-x-2 text-xl font-bold text-gray-900">
                      <BarChart3 className="h-6 w-6 text-indigo-600" />
                      <span>Yearly Performance Snapshot</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {(reportData.yearlyStats as unknown as YearlyStat[]).map(
                        (year) => (
                          <div
                            key={year.year}
                            className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-6"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-black text-gray-900">
                                {year.year}
                              </span>
                              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                                Annual Summary
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                  Revenue
                                </p>
                                <p className="text-lg font-bold text-gray-900">
                                  â‚¹{year.revenue.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                  Orders
                                </p>
                                <p className="text-lg font-bold text-gray-900">
                                  {year.orders}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                  Visits
                                </p>
                                <p className="text-lg font-bold text-gray-900">
                                  {year.visits}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                  Growth
                                </p>
                                <p className="text-lg font-bold text-green-600">
                                  +--%
                                </p>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Actions & Preview */}
              <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                  @media print {
                    aside, header, nav, .no-print, button, select, 
                    .flex.space-x-2.border-b, .grid-cols-1.gap-6,
                    .bg-gray-50\\/50, .border-b.border-gray-50, .no-print-tab {
                      display: none !important;
                    }
                    body {
                      background: white !important;
                      color: black !important;
                    }
                    main {
                      padding: 0 !important;
                      margin: 0 !important;
                      width: 100% !important;
                      max-width: 100% !important;
                    }
                    .shadow-sm, .rounded-3xl, .rounded-2xl {
                      border: none !important;
                      box-shadow: none !important;
                      border-radius: 0 !important;
                    }
                    .overflow-x-auto {
                      overflow: visible !important;
                    }
                    table {
                      width: 100% !important;
                      border-collapse: collapse !important;
                    }
                    th, td {
                      border-bottom: 1px solid #cbd5e1 !important;
                      padding: 8px 12px !important;
                    }
                  }
                `,
                  }}
                />

                <div className="no-print flex flex-col gap-4 border-b border-gray-50 bg-gray-50/50 p-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    <h3 className="flex items-center space-x-2 font-bold text-gray-900">
                      <Layers className="h-5 w-5 text-blue-600" />
                      <span>Data Preview</span>
                    </h3>
                    <div className="no-print-tab flex rounded-xl bg-gray-100/80 p-1">
                      <button
                        onClick={() => setPreviewTab("sales")}
                        className={cn(
                          "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                          previewTab === "sales"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900",
                        )}
                      >
                        Sales Records
                      </button>
                      <button
                        onClick={() => setPreviewTab("location")}
                        className={cn(
                          "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                          previewTab === "location"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900",
                        )}
                      >
                        Location Logs
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleDownloadSales}
                      disabled={!reportData?.sales.length}
                      className="flex items-center space-x-2 rounded-xl bg-blue-100 px-5 py-2 text-sm font-bold text-blue-700 transition-all hover:bg-blue-200 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Sales XLSX</span>
                    </button>
                    <button
                      onClick={handleDownloadSalesPDF}
                      disabled={!reportData?.sales.length}
                      id="export-sales-pdf"
                      className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Sales PDF</span>
                    </button>
                    <button
                      onClick={handleDownloadAttendance}
                      disabled={!reportData?.attendance.length}
                      className="flex items-center space-x-2 rounded-xl bg-purple-100 px-5 py-2 text-sm font-bold text-purple-700 transition-all hover:bg-purple-200 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Attendance XLSX</span>
                    </button>
                    <button
                      onClick={handleDownloadAttendancePDF}
                      disabled={!reportData?.attendance.length}
                      id="export-attendance-pdf"
                      className="flex items-center space-x-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-purple-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Attendance PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!targetId) {
                          alert(
                            "Please select a specific Target Entity to seed logs.",
                          );
                          return;
                        }
                        seedMutation.mutate({ targetId });
                      }}
                      disabled={seedMutation.isPending}
                      className="no-print flex items-center space-x-2 rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-700 active:scale-95 disabled:opacity-50"
                    >
                      <span>
                        {seedMutation.isPending
                          ? "Seeding..."
                          : "Seed Fake Data"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="p-0">
                  <div className="overflow-x-auto">
                    {previewTab === "sales" ? (
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-bold tracking-wider text-gray-500 uppercase">
                          <tr>
                            <th className="px-6 py-4">Order #</th>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {isLoading ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-6 py-12 text-center text-gray-400"
                              >
                                Loading intelligence data...
                              </td>
                            </tr>
                          ) : reportData?.sales.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-6 py-12 text-center text-gray-400"
                              >
                                No data found for this selection.
                              </td>
                            </tr>
                          ) : (
                            reportData?.sales.slice(0, 10).map((s) => (
                              <tr
                                key={s.orderNumber}
                                className="transition-colors hover:bg-gray-50/50"
                              >
                                <td className="px-6 py-4 font-mono font-medium text-blue-600">
                                  {s.orderNumber}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium">
                                  {s.userName}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {s.customerName}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold">
                                  â‚¹
                                  {parseFloat(s.invoiceAmount).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={cn(
                                      "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase",
                                      s.status === "Approved"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700",
                                    )}
                                  >
                                    {s.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400">
                                  {new Date(s.date).toLocaleDateString()}
                                </td>
                              </tr>
                            ))
                          )}
                          {reportData?.sales &&
                            reportData.sales.length > 10 && (
                              <tr className="no-print">
                                <td
                                  colSpan={6}
                                  className="px-6 py-4 text-center text-xs text-gray-400 italic"
                                >
                                  Previewing first 10 records. Download full
                                  XLSX for complete data.
                                </td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex w-full flex-col gap-8">
                        {isLoading ? (
                          <div className="py-12 text-center text-gray-400">
                            Loading location logs...
                          </div>
                        ) : !reportData?.attendance ||
                          reportData.attendance.length === 0 ? (
                          <div className="py-12 text-center text-gray-400">
                            No location logs found for this selection.
                          </div>
                        ) : (
                          Object.entries(
                            reportData.attendance.reduce(
                              (acc, log) => {
                                const userAcc =
                                  acc[log.userName] ?? (acc[log.userName] = {});
                                const dateAcc =
                                  userAcc[log.date] ?? (userAcc[log.date] = {});
                                dateAcc[log.slab] =
                                  log.locationName ??
                                  `${parseFloat(String(log.latitude)).toFixed(4)}, ${parseFloat(String(log.longitude)).toFixed(4)}`;
                                return acc;
                              },
                              {} as Record<
                                string,
                                Record<string, Record<string, string>>
                              >,
                            ),
                          ).map(([employeeName, dates]) => (
                            <div
                              key={employeeName}
                              className="mb-8 break-inside-avoid overflow-hidden rounded-xl border border-gray-200"
                            >
                              <div className="border-b border-gray-200 bg-gray-100 px-6 py-4 text-lg font-bold text-gray-900">
                                Employee Name: {employeeName}
                              </div>
                              <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                  <tr>
                                    <th className="border-b border-gray-200 px-6 py-4">
                                      Date
                                    </th>
                                    <th className="border-b border-gray-200 px-6 py-4">
                                      8-10 am
                                    </th>
                                    <th className="border-b border-gray-200 px-6 py-4">
                                      10-2 pm
                                    </th>
                                    <th className="border-b border-gray-200 px-6 py-4">
                                      2-6 pm
                                    </th>
                                    <th className="border-b border-gray-200 px-6 py-4">
                                      6-9 pm
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {Object.entries(dates).map(
                                    ([date, slabs]) => (
                                      <tr
                                        key={date}
                                        className="transition-colors hover:bg-gray-50/50"
                                      >
                                        <td className="border-b border-gray-100 px-6 py-4 text-sm font-semibold text-gray-900">
                                          {date}
                                        </td>
                                        <td className="border-b border-gray-100 px-6 py-4 text-sm text-gray-600">
                                          {slabs["00:00-10:00"] ?? "-"}
                                        </td>
                                        <td className="border-b border-gray-100 px-6 py-4 text-sm text-gray-600">
                                          {slabs["10:00-14:00"] ?? "-"}
                                        </td>
                                        <td className="border-b border-gray-100 px-6 py-4 text-sm text-gray-600">
                                          {slabs["14:00-18:00"] ?? "-"}
                                        </td>
                                        <td className="border-b border-gray-100 px-6 py-4 text-sm text-gray-600">
                                          {slabs["18:00-21:00"] ?? "-"}
                                        </td>
                                      </tr>
                                    ),
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="flex items-center space-x-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div
        className={cn("rounded-xl p-3", colors[color as keyof typeof colors])}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function TargetUserSelect({
  targetId,
  setTargetId,
  selectableUsers,
}: {
  targetId: string | null;
  setTargetId: (val: string | null) => void;
  selectableUsers?: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    role: string;
    employeeCode: string | null;
  }>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  if (targetId && !searchTerm && !isOpen) {
    const u = selectableUsers?.find((x) => x.id === targetId);
    if (u) {
      setSearchTerm(`${u.firstName} ${u.lastName ?? ""}`.trim());
    }
  }

  const filteredUsers = selectableUsers?.filter((u) => {
    const name = `${u.firstName} ${u.lastName ?? ""}`.toLowerCase();
    const code = u.employeeCode?.toLowerCase() ?? "";
    const term = searchTerm.toLowerCase();
    return name.includes(term) || code.includes(term);
  });

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search by name or employee code..."
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500"
      />
      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg">
          <button
            onClick={() => {
              setTargetId(null);
              setSearchTerm("");
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 border-b border-gray-50"
          >
            <div className="font-semibold text-gray-700">Current User (Self)</div>
          </button>
          {filteredUsers?.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No users found.</div>
          ) : (
            filteredUsers?.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setTargetId(u.id);
                  setSearchTerm(`${u.firstName} ${u.lastName ?? ""}`.trim());
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                <div className="font-medium text-gray-800">
                  {u.firstName} {u.lastName} <span className="text-xs font-normal text-gray-500">({u.role})</span>
                </div>
                {u.employeeCode && (
                  <div className="text-xs text-gray-400 mt-0.5">Code: {u.employeeCode}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  );
}
