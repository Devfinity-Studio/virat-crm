"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { Loader2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { DailyReportPDFTemplate } from "./DailyReportPDFTemplate";

async function captureReportCanvas(element: HTMLElement) {
  return await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (clonedDoc) => {
      // 1. Remove all style/link tags in clonedDoc that contain Tailwind v4 oklch rules
      const styleTags = clonedDoc.querySelectorAll(
        "style, link[rel='stylesheet']",
      );
      styleTags.forEach((tag) => tag.remove());

      // 2. Inject clean, standard print styles for the template (NO oklch)
      const printStyle = clonedDoc.createElement("style");
      printStyle.textContent = `
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }
        .pdf-page {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
          background-color: #ffffff;
          color: #000000;
          box-sizing: border-box;
        }
        .pdf-container {
          border: 2px solid #000000;
          min-height: 275mm;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .pdf-header {
          display: flex;
          border-bottom: 2px solid #000000;
          padding: 8px;
          align-items: flex-start;
        }
        .pdf-title {
          flex: 1;
          text-align: center;
          padding-top: 8px;
          font-size: 20px;
          font-weight: 700;
          color: #000000;
        }
        .pdf-user-details {
          padding: 12px 8px 16px 8px;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-bottom: 2px solid #000000;
          color: #000000;
        }
        .pdf-field-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .pdf-field-underline {
          flex: 1;
          border-bottom: 1.5px solid #000000;
          padding-bottom: 2px;
          font-weight: 600;
          text-transform: uppercase;
          min-height: 22px;
          color: #000000;
        }
        .pdf-table {
          width: 100%;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          border-collapse: collapse;
          color: #000000;
        }
        .pdf-table th {
          background-color: #cbd5e1 !important;
          border: 1px solid #000000;
          padding: 6px;
          color: #000000;
        }
        .pdf-table td {
          border: 1px solid #000000;
          padding: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #000000;
        }
        .pdf-table tr {
          height: 52px;
        }
        .pdf-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          margin-bottom: 60px;
          padding: 0 16px;
          font-weight: 700;
          font-size: 13px;
          color: #000000;
        }
      `;
      clonedDoc.head.appendChild(printStyle);

      const staging = clonedDoc.getElementById("pdf-render-staging-container");
      if (staging) {
        staging.style.position = "static";
        staging.style.left = "0";
        staging.style.top = "0";
      }
    },
  });
}

export function PrintReportDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  employeeData,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  employeeData?: any;
  defaultDate?: string;
}) {
  const getTodayIST = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const [startDate, setStartDate] = useState(defaultDate ?? getTodayIST());
  const [endDate, setEndDate] = useState(defaultDate ?? getTodayIST());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [fetchedReportsByDate, setFetchedReportsByDate] = useState<
    Record<string, any[]>
  >({});

  useEffect(() => {
    if (open) {
      const initial = defaultDate ?? getTodayIST();
      setStartDate(initial);
      setEndDate(initial);
    }
  }, [open, defaultDate]);

  const utils = api.useUtils();

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select a date range");
      return;
    }

    setIsGenerating(true);
    setProgress("Fetching reports...");
    setFetchedReportsByDate({});

    try {
      const reports = await utils.dailyReports.listScopedReports.fetch({
        scope: employeeId ? "individual" : "all",
        targetId: employeeId && employeeId.length > 0 ? employeeId : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 500,
      });

      if (!reports || reports.length === 0) {
        toast.error("No reports found for this date range.");
        setIsGenerating(false);
        return;
      }

      // Group reports by date string (YYYY-MM-DD in Asia/Kolkata)
      const reportsByDate = reports.reduce((acc, report) => {
        const d = new Date(report.reportDate).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        });
        if (!acc[d]) acc[d] = [];
        acc[d].push(report);
        return acc;
      }, {} as Record<string, typeof reports>);

      setFetchedReportsByDate(reportsByDate);

      // Wait for React to render the hidden templates in DOM
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dates = Object.keys(reportsByDate).sort();
      if (dates.length === 0) {
        toast.error("No reports found for this date range.");
        setIsGenerating(false);
        return;
      }

      const cleanEmpName = employeeName.replace(/\s+/g, "_");

      if (dates.length === 1) {
        // Single day: generate and download single PDF directly!
        const dateStr = dates[0]!;
        setProgress(`Generating PDF for ${dateStr}...`);

        const element = document.getElementById(`pdf-template-${dateStr}`);
        if (!element) {
          throw new Error("Unable to locate rendered report template");
        }

        const canvas = await captureReportCanvas(element);
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        const renderHeight = Math.min(pdfHeight, 297);

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, renderHeight);

        pdf.save(`Report_${cleanEmpName}_${dateStr}.pdf`);
        toast.success(`Report for ${dateStr} downloaded as PDF!`);
        onOpenChange(false);
      } else {
        // Multiple days: bundle all daily PDFs into a ZIP!
        const zip = new JSZip();

        for (let i = 0; i < dates.length; i++) {
          const dateStr = dates[i]!;
          setProgress(
            `Generating PDF for ${dateStr} (${i + 1}/${dates.length})...`,
          );

          await new Promise((resolve) => setTimeout(resolve, 50));

          const element = document.getElementById(`pdf-template-${dateStr}`);
          if (!element) continue;

          const canvas = await captureReportCanvas(element);
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          const renderHeight = Math.min(pdfHeight, 297);

          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, renderHeight);

          const pdfBlob = pdf.output("blob");
          zip.file(`Report_${cleanEmpName}_${dateStr}.pdf`, pdfBlob);
        }

        setProgress("Creating ZIP archive...");
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(
          content,
          `Reports_${cleanEmpName}_${startDate}_to_${endDate}.zip`,
        );
        toast.success(`Reports downloaded as ZIP (${dates.length} days)!`);
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Report PDF generation error:", error);
      toast.error(error?.message || "Failed to generate reports");
    } finally {
      setIsGenerating(false);
      setProgress("");
      setFetchedReportsByDate({});
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Daily Reports</DialogTitle>
            <DialogDescription>
              Generate and download daily reports for {employeeName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {isGenerating && (
              <div className="text-sm text-center text-blue-600 font-medium">
                {progress}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full font-bold border-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  const d = startDate || getTodayIST();
                  window.open(
                    `/reports/print?userId=${employeeId}&date=${d}`,
                    "_blank",
                  );
                }}
              >
                <Printer className="h-4 w-4 mr-2 text-blue-600" />
                Open Blank Printable A4 Sheet
              </Button>

              <Button
                className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isGenerating
                  ? "Generating..."
                  : startDate === endDate
                    ? "Download Daily Report (PDF)"
                    : "Download Daily Reports (ZIP)"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden templates rendered via Portal to document.body outside Dialog transform */}
      {typeof document !== "undefined" &&
        Object.keys(fetchedReportsByDate).length > 0 &&
        createPortal(
          <div
            id="pdf-render-staging-container"
            style={{
              position: "fixed",
              top: 0,
              left: "-10000px",
              width: "210mm",
              pointerEvents: "none",
              zIndex: -99999,
            }}
            aria-hidden="true"
          >
            {Object.entries(fetchedReportsByDate).map(([dateStr, reports]) => (
              <DailyReportPDFTemplate
                key={dateStr}
                dateStr={dateStr}
                user={
                  employeeData ?? {
                    firstName: employeeName.split(" ")[0],
                    lastName: employeeName.split(" ")[1],
                  }
                }
                branchName={employeeData?.branch?.name ?? ""}
                reports={reports}
              />
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
