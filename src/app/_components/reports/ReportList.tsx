"use client";

import { api } from "@/trpc/react";
import { format } from "date-fns";
import {
  FileText,
  User,
  Calendar,
  ChevronRight,
  Search,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer } from "lucide-react";
import { PrintReportDialog } from "./PrintReportDialog";
import { TimeSlabHistory } from "./TimeSlabHistory";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ReportListProps {
  isManager?: boolean;
  isAdmin?: boolean;
}

export function ReportList({ isManager = false, isAdmin = false }: ReportListProps) {
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const [printEmployeeId, setPrintEmployeeId] = useState<string>("");
  const [printEmployeeName, setPrintEmployeeName] = useState<string>("");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const { data: usersForPrint } = api.users.getUsersForDropdown.useQuery(undefined, {
    enabled: isManager || isAdmin,
  });
  
  const [scope, setScope] = useState<"individual" | "management" | "branch">("individual");
  const [branchId, setBranchId] = useState<string>("");

  const { data: branches } = api.users.getPublicBranches.useQuery(undefined, {
    enabled: isAdmin,
  });

  const { data: reports, isLoading } = api.dailyReports.listScopedReports.useQuery({
    scope: isManager ? scope : "individual",
    branchId: scope === "branch" && branchId ? parseInt(branchId) : undefined,
    limit: 50,
  });

  const filteredReports = reports?.filter(
    (report) =>
      report.content.toLowerCase().includes(search.toLowerCase()) ||
      (report.customer?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (isManager &&
        `${report.user.firstName} ${report.user.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Scope Selector for Managers */}
      {isManager && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200">
            <Button
              variant={scope === "individual" ? "default" : "ghost"}
              className={`flex-1 rounded-lg font-bold shadow-none ${scope === "individual" ? "bg-white text-blue-600 hover:bg-white" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setScope("individual")}
            >
              My Reports
            </Button>
            <Button
              variant={scope === "management" ? "default" : "ghost"}
              className={`flex-1 rounded-lg font-bold shadow-none ${scope === "management" ? "bg-white text-blue-600 hover:bg-white" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setScope("management")}
            >
              Team Reports
            </Button>
            {isAdmin && (
              <Button
                variant={scope === "branch" ? "default" : "ghost"}
                className={`flex-1 rounded-lg font-bold shadow-none ${scope === "branch" ? "bg-white text-blue-600 hover:bg-white" : "text-slate-500 hover:text-slate-700"}`}
                onClick={() => setScope("branch")}
              >
                Branch Reports
              </Button>
            )}
          </div>
          
          {scope === "branch" && isAdmin && (
            <div className="flex items-center gap-2">
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="w-[200px] rounded-xl border-2 border-slate-200 bg-white font-bold shadow-sm focus:ring-0">
                  <SelectValue placeholder="Select a branch..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200">
                  {branches?.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()} className="font-medium">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Search Bar & Print Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-2 shadow-[0_4px_0_0_rgba(226,232,240,1)]">
          <div className="pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            placeholder="Search by content, employee, or customer..."
            className="border-none bg-transparent text-sm focus-visible:ring-0 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {(isManager || isAdmin) && (
          <div className="flex gap-2">
            <Select value={printEmployeeId} onValueChange={(val) => {
              setPrintEmployeeId(val);
              const u = usersForPrint?.find((x: any) => x.id === val);
              if (u) setPrintEmployeeName(`${u.firstName} ${u.lastName}`);
            }}>
              <SelectTrigger className="w-[200px] h-[52px] rounded-xl border-2 border-slate-200 bg-white shadow-[0_4px_0_0_rgba(226,232,240,1)] font-bold">
                <SelectValue placeholder="Select Employee to Print" />
              </SelectTrigger>
              <SelectContent>
                {usersForPrint?.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              className="h-[52px] rounded-xl gap-2 font-bold shadow-[0_4px_0_0_rgba(15,23,42,1)]"
              disabled={!printEmployeeId}
              onClick={() => setIsPrintDialogOpen(true)}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        )}
      </div>

      <PrintReportDialog 
        open={isPrintDialogOpen} 
        onOpenChange={setIsPrintDialogOpen}
        employeeId={printEmployeeId}
        employeeName={printEmployeeName}
        employeeData={usersForPrint?.find((x: any) => x.id === printEmployeeId)}
      />

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl border-2 border-slate-200" />
            ))}
          </div>
        ) : filteredReports && filteredReports.length > 0 ? (
          filteredReports.map((report) => {
            const isTeamReport = true; // Temporary since we don't have current user ID easily available here without another hook, scope check handles it

            return (
              <Card
                key={report.id}
                className={`group overflow-hidden rounded-2xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-md odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-800/50 ${
                  scope === "management" || scope === "branch" ? "border-indigo-200" : "border-slate-200"
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Left: Metadata */}
                    <div className="flex flex-col justify-between border-b-2 border-slate-100 p-5 md:w-64 md:border-r-2 md:border-b-0">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <Calendar className="h-4 w-4" />
                          </div>
                          {format(new Date(report.reportDate), "MMM dd, yyyy")}
                        </div>

                        {(scope === "management" || scope === "branch") && (
                          <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-100 p-2 rounded-lg font-bold border-2 border-slate-200/50">
                            <User className="h-4 w-4 text-indigo-500" />
                            <span>
                              {report.user.firstName} {report.user.lastName}
                            </span>
                          </div>
                        )}

                        {report.customer && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-1 font-bold text-emerald-700"
                            >
                              {report.customer.name}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 font-mono text-[11px] font-bold tracking-wider text-slate-400 uppercase md:mt-0">
                        ID: #{report.id}
                      </div>
                    </div>

                    {/* Right: Content */}
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-3 flex items-center gap-2 text-blue-600">
                            <FileText className="h-4 w-4" />
                            <span className="text-[11px] font-black tracking-widest uppercase">
                              Report Narrative
                            </span>
                          </div>
                          <p className="line-clamp-4 text-sm font-medium leading-relaxed whitespace-pre-wrap text-slate-700 transition-all group-hover:line-clamp-none">
                            {report.content}
                          </p>
                        </div>
                        <div className="hidden md:block">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border-2 border-slate-200 transition-colors group-hover:bg-blue-100 group-hover:border-blue-200 group-hover:text-blue-600">
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t-2 border-slate-100 pt-4">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">
                          Submitted {format(new Date(report.createdAt), "hh:mm a")}
                        </div>
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-black tracking-tight text-blue-600 uppercase hover:bg-blue-100 transition-colors"
                        >
                          Full History <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="rounded-3xl border-4 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-slate-100 bg-white shadow-sm">
              <FileText className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800">
              No reports found
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm font-medium text-slate-500">
              {search
                ? "No reports match your current search filters."
                : "No reports to display for the selected scope."}
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
      >
        <DialogContent className="overflow-hidden bg-slate-50/50 sm:max-w-[600px] border-4 border-slate-200 rounded-3xl shadow-2xl">
          <DialogHeader className="bg-white p-6 border-b-2 border-slate-100">
            <DialogTitle className="flex items-center gap-3 text-xl font-black text-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              History for{" "}
              {selectedReport &&
                format(new Date(selectedReport.reportDate), "MMM dd, yyyy")}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {selectedReport && (
              <TimeSlabHistory
                userId={selectedReport.user.id}
                date={new Date(selectedReport.reportDate)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
