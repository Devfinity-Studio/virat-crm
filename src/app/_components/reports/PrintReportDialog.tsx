"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { DailyReportPDFTemplate } from "./DailyReportPDFTemplate";

export function PrintReportDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  employeeData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  employeeData?: any;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [fetchedReportsByDate, setFetchedReportsByDate] = useState<Record<string, any[]>>({});

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
        scope: "individual",
        targetId: employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        limit: 1000,
      });

      if (!reports || reports.length === 0) {
        toast.error("No reports found for this date range.");
        setIsGenerating(false);
        return;
      }

      // Group reports by date string (YYYY-MM-DD)
      const reportsByDate = reports.reduce((acc, report) => {
        const d = format(new Date(report.reportDate), "yyyy-MM-dd");
        if (!acc[d]) acc[d] = [];
        acc[d].push(report);
        return acc;
      }, {} as Record<string, typeof reports>);

      setFetchedReportsByDate(reportsByDate);

      // Wait a frame for React to render the hidden templates
      await new Promise((resolve) => setTimeout(resolve, 500));

      const zip = new JSZip();
      const dates = Object.keys(reportsByDate).sort();

      for (let i = 0; i < dates.length; i++) {
        const dateStr = dates[i];
        setProgress(`Generating PDF for ${dateStr} (${i + 1}/${dates.length})...`);
        
        await new Promise((resolve) => setTimeout(resolve, 100));

        const element = document.getElementById(`pdf-template-${dateStr}`);
        if (!element) continue;

        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        
        const pdfBlob = pdf.output("blob");
        zip.file(`Report_${employeeName.replace(/\s+/g, "_")}_${dateStr}.pdf`, pdfBlob);
      }

      setProgress("Zipping files...");
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Reports_${employeeName.replace(/\s+/g, "_")}_${startDate}_to_${endDate}.zip`);
      toast.success("Reports downloaded successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate reports");
    } finally {
      setIsGenerating(false);
      setProgress("");
      // keep fetchedReportsByDate so they fade out instead of disappearing?
      // actually clear it
      setFetchedReportsByDate({});
    }
  };

  return (
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

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? "Generating..." : "Generate ZIP"}
          </Button>
        </div>

        {/* Hidden templates for html2canvas */}
        {Object.entries(fetchedReportsByDate).map(([dateStr, reports]) => (
          <DailyReportPDFTemplate
            key={dateStr}
            dateStr={dateStr}
            user={employeeData ?? { firstName: employeeName.split(" ")[0], lastName: employeeName.split(" ")[1] }}
            branchName={employeeData?.branch?.name ?? ""}
            reports={reports}
          />
        ))}
      </DialogContent>
    </Dialog>
  );
}
