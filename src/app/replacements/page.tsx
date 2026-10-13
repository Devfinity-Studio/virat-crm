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
import { Plus, Check, X, Loader2, FileText, Download } from "lucide-react";
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
    titleRow.font = { bold: true, color: { argb: "FF800000" } }; // Dark red/maroon color like the image

    // Header Row
    const headers = [
      "Sl.No",
      "Request Date",
      "Replacement ID",
      "Original Order No",
      "Agent Name",
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

      worksheet.addRow([
        slNo++,
        requestDate,
        req.id,
        orderNo,
        agentName,
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
      col.width = maxLen + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "Replacement_Register.xlsx");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Replacements</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 text-emerald-700 hover:text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" onClick={handleExportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Link href="/replacements/new">
              <Button size="sm" className="h-9">
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
              className="cursor-pointer px-4 py-1 whitespace-nowrap"
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
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
          </div>
        ) : filteredReplacements.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No Replacements Found
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              There are no replacements to display.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredReplacements.map((req) => (
              <Card key={req.id} className="overflow-hidden odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-800/50 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="truncate text-base">
                      Request #{req.id}
                    </CardTitle>
                    <Badge
                      variant={
                        req.status === "Approved"
                          ? "default"
                          : req.status === "Rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {req.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="mt-2 flex flex-col space-y-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[10px] uppercase">
                        Original Sale
                      </span>
                      <span className="font-mono font-medium">
                        {req.sale?.orderNumber ?? `ID: ${req.originalSaleId}`}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[10px] uppercase">
                        Agent
                      </span>
                      <span
                        className="truncate font-medium"
                        title={String(
                          `${req.user?.firstName ?? ""} ${req.user?.lastName ?? ""}`.trim(),
                        )}
                      >
                        {`${req.user?.firstName ?? ""} ${req.user?.lastName ?? ""}`.trim() ||
                          "Unknown"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col">
                      <span className="text-muted-foreground text-[10px] uppercase">
                        Reason
                      </span>
                      <p className="line-clamp-3 text-sm font-medium">
                        {req.reason}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-col border-t border-dashed pt-2">
                      <span className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] uppercase">
                        <FileText className="h-3 w-3" /> Documents
                      </span>
                      <FileGallery
                        entityType="replacement"
                        entityId={req.id}
                        initialFiles={req.files}
                      />
                    </div>
                  </div>

                  {req.status === "Pending" && (
                    <div className="mt-4 flex gap-2 border-t pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        onClick={() =>
                          updateStatus({
                            replacementId: req.id,
                            status: "Approved",
                          })
                        }
                        disabled={isUpdating}
                      >
                        <Check className="mr-1 h-3 w-3" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        onClick={() =>
                          updateStatus({
                            replacementId: req.id,
                            status: "Rejected",
                          })
                        }
                        disabled={isUpdating}
                      >
                        <X className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
