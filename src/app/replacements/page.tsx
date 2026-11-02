"use client";

import { DashboardLayout } from "../_components/layout/DashboardLayout";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, X, Loader2, FileText, Download, UserCheck, Package } from "lucide-react";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Link from "next/link";
import { useState } from "react";
import { FileGallery } from "@/app/_components/ui/FileGallery";

export default function ReplacementsDashboard() {
  const [filter, setFilter] = useState<
    "All" | "Pending" | "Approved" | "Rejected"
  >("All");

  const {
    data: replacements,
    isLoading,
    refetch,
  } = api.replacements.getReplacements.useQuery();
  const { mutate: updateStatus, isPending: isUpdating } =
    api.replacements.updateReplacementStatus.useMutation({
      onSuccess: () => refetch(),
      onError: (error) => {
        alert(`Status update failed: ${error.message}`);
      },
    });

  const filteredReplacements =
    replacements?.filter((req) => filter === "All" || req.status === filter) ??
    [];

  const handleExportExcel = async () => {
    if (!filteredReplacements || filteredReplacements.length === 0) {
      alert("No data to export");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Replacement Register");

    // Title Row
    worksheet.addRow(["[U07TFQ"]);
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, color: { argb: "FF800000" } };

    // Header Row
    const headers = [
      "Sl.No",
      "Request Date",
      "Replacement ID",
      "Original Order No",
      "Agent Name",
      "AO (Agricultural Officer)",
      "Replaced Products",
      "Reason",
      "Status",
    ];
    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF008080" }, // Teal color
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    let slNo = 1;
    for (const req of filteredReplacements) {
      const requestDate = new Date(req.createdAt).toLocaleDateString("en-US");
      const agentName = `${req.user?.firstName || ""} ${req.user?.lastName || ""}`.trim();
      const orderNo = req.sale?.orderNumber || req.originalSaleId.toString();
      const aoName = req.ao
        ? `${req.ao.firstName || ""} ${req.ao.lastName || ""} ${req.ao.employeeCode ? `(${req.ao.employeeCode})` : ""}`.trim()
        : "None";
      const itemsSummary =
        req.items && req.items.length > 0
          ? req.items
              .map(
                (it: any) =>
                  `${it.product?.name || `Product #${it.productId}`} (Qty: ${it.quantity})`,
              )
              .join("; ")
          : "None specified";

      worksheet.addRow([
        slNo++,
        requestDate,
        req.id,
        orderNo,
        agentName,
        aoName,
        itemsSummary,
        req.reason,
        req.status,
      ]);
    }

    // Auto-fit columns
    worksheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        if (cell.value) {
          const valLen = cell.value.toString().length;
          if (valLen > maxLen) maxLen = valLen;
        }
      });
      col.width = Math.min(maxLen + 3, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Replacement_Register.xlsx");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Replacements
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-emerald-700 hover:text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              onClick={handleExportExcel}
            >
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Link href="/replacements/new">
              <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium">
                <Plus className="mr-2 h-4 w-4" />
                Submit Request
              </Button>
            </Link>
          </div>
        </div>

        <div className="scrollbar-hide flex space-x-2 overflow-x-auto pb-2">
          {["All", "Pending", "Approved", "Rejected"].map((f) => (
            <Badge
              key={f}
              variant={filter === f ? "default" : "outline"}
              className={`cursor-pointer px-4 py-1 whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300"
              }`}
              onClick={() =>
                setFilter(f as "All" | "Pending" | "Approved" | "Rejected")
              }
            >
              {f}
            </Badge>
          ))}
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="text-blue-600 h-8 w-8 animate-spin" />
          </div>
        ) : filteredReplacements.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center bg-white">
            <p className="text-slate-600 text-sm font-medium">
              No Replacements Found
            </p>
            <p className="text-slate-400 mt-1 text-xs">
              There are no replacements matching the selected filter.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredReplacements.map((req) => (
              <Card
                key={req.id}
                className="overflow-hidden bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="truncate text-base font-bold text-slate-900">
                      Replacement #{req.id}
                    </CardTitle>
                    <Badge
                      variant={
                        req.status === "Approved"
                          ? "default"
                          : req.status === "Rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className={
                        req.status === "Approved"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          : req.status === "Rejected"
                            ? "bg-red-600 hover:bg-red-700 text-white font-medium"
                            : "bg-amber-100 text-amber-800 border-amber-200 font-medium"
                      }
                    >
                      {req.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Requested on {new Date(req.createdAt).toLocaleDateString()}
                    {req.replacementType && ` • ${req.replacementType}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-3 pb-4">
                  <div className="flex flex-col space-y-3 text-sm">
                    {/* Sale & Agent Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold">
                          Original Sale
                        </span>
                        <span className="font-mono font-medium text-slate-900">
                          {req.sale?.orderNumber ?? `ID: ${req.originalSaleId}`}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold">
                          Created By
                        </span>
                        <span
                          className="truncate font-medium text-slate-900"
                          title={String(
                            `${req.user?.firstName ?? ""} ${req.user?.lastName ?? ""}`.trim(),
                          )}
                        >
                          {`${req.user?.firstName ?? ""} ${req.user?.lastName ?? ""}`.trim() ||
                            "Unknown"}
                        </span>
                      </div>
                      {/* AO Field */}
                      <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-blue-600" />
                          AO (Agricultural Officer)
                        </span>
                        {req.ao ? (
                          <span className="truncate font-medium text-blue-900 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200 text-xs inline-flex items-center gap-1.5 w-fit mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                            {req.ao.firstName} {req.ao.lastName ?? ""}
                            {req.ao.employeeCode && (
                              <span className="font-mono text-[10px] text-blue-700 font-bold">
                                [{req.ao.employeeCode}]
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            None assigned
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Replaced Products List */}
                    {req.items && req.items.length > 0 && (
                      <div className="mt-2 flex flex-col border-t border-slate-100 pt-2">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold mb-1.5 flex items-center gap-1">
                          <Package className="h-3 w-3 text-slate-500" />
                          Replaced Products ({req.items.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/80 rounded-lg p-2.5 border border-slate-100">
                          {req.items.map((it: any) => (
                            <div
                              key={it.id}
                              className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200 shadow-2xs"
                            >
                              <span className="text-slate-800 font-medium truncate max-w-[70%]">
                                {it.product?.name ?? `Product #${it.productId}`}
                              </span>
                              <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {it.quantity} {it.product?.unit || "units"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <div className="mt-1 flex flex-col">
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">
                        Reason
                      </span>
                      <p className="line-clamp-3 text-sm text-slate-700 mt-0.5 bg-slate-50 p-2 rounded border border-slate-100">
                        {req.reason}
                      </p>
                    </div>

                    {/* Documents */}
                    <div className="mt-2 flex flex-col border-t border-dashed border-slate-200 pt-2">
                      <span className="text-slate-500 mb-1 flex items-center gap-1 text-[10px] uppercase font-semibold">
                        <FileText className="h-3 w-3" /> Documents & Attachments
                      </span>
                      <FileGallery
                        entityType="replacement"
                        entityId={req.id}
                        initialFiles={req.files}
                      />
                    </div>
                  </div>


                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
