import React from "react";
import Image from "next/image";
import { format } from "date-fns";

export function DailyReportPDFTemplate({
  dateStr,
  user,
  branchName,
  reports,
}: {
  dateStr: string;
  user: any;
  branchName: string;
  reports: any[];
}) {
  const reportRows = [...reports];
  while (reportRows.length < 10) {
    reportRows.push(null as any);
  }
  const visibleRows = reportRows.slice(0, 10);

  return (
    <div
      id={`pdf-template-${dateStr}`}
      className="bg-white p-[10mm]"
      style={{
        width: "210mm",
        minHeight: "297mm",
        position: "absolute",
        left: "-9999px",
        top: 0,
      }}
    >
      {/* Main Border Container */}
      <div className="border-[2px] border-black h-full flex flex-col">
        {/* Header Row */}
        <div className="flex border-b-[2px] border-black pb-2 items-start p-2">
          <div className="w-[120px] pt-1">
            <Image
              src="/logo-removebg-preview.png"
              alt="Logo"
              width={100}
              height={60}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex-1 text-center pt-2">
            <h1 className="text-xl font-bold font-sans">
              DAILY ACTIVITY REPORT BM & ABOVE
            </h1>
          </div>
          <div className="w-[120px]" /> {/* Spacer for balance */}
        </div>

        {/* User Details */}
        <div className="px-2 py-3 text-sm font-bold flex flex-col gap-2 border-b-[2px] border-black pb-4">
          <div className="flex items-end gap-2">
            <span className="w-16">NAME:</span>
            <div className="flex-1 border-b-[1.5px] border-black pb-0.5 font-semibold uppercase">
              {user?.firstName} {user?.lastName}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="w-16">DEG:</span>
            <div className="flex-1 border-b-[1.5px] border-black pb-0.5 max-w-[200px] font-semibold uppercase">
              {user?.role}
            </div>
            <span className="ml-4">BRANCH:</span>
            <div className="flex-1 border-b-[1.5px] border-black pb-0.5 font-semibold uppercase">
              {branchName || ""}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="w-20">E CODE:</span>
            <div className="w-[150px] border-b-[1.5px] border-black pb-0.5 font-semibold uppercase">
              {user?.employeeCode}
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-center text-sm font-bold border-collapse">
          <thead>
            <tr className="bg-slate-300">
              <th rowSpan={2} className="border border-black p-2 w-[40px]">
                SL
              </th>
              <th rowSpan={2} className="border border-black p-2 w-[100px]">
                DATE
              </th>
              <th colSpan={2} className="border border-black p-1">
                TIME
              </th>
              <th rowSpan={2} className="border border-black p-2 w-[130px]">
                PLACE
              </th>
              <th rowSpan={2} className="border border-black p-2">
                NATURE OF WORK
              </th>
            </tr>
            <tr className="bg-slate-300">
              <th className="border border-black p-1 w-[70px] text-xs">FROM</th>
              <th className="border border-black p-1 w-[70px] text-xs">TO</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((report, index) => (
              <tr key={index} className="h-[55px]">
                <td className="border border-black p-2">{index + 1}</td>
                <td className="border border-black p-2 text-xs font-semibold">
                  {report ? format(new Date(report.reportDate), "dd-MMM-yyyy") : ""}
                </td>
                <td className="border border-black p-2 text-xs font-semibold">
                  {report?.timeFrom || ""}
                </td>
                <td className="border border-black p-2 text-xs font-semibold">
                  {report?.timeTo || ""}
                </td>
                <td className="border border-black p-2 text-xs font-semibold">
                  {report?.customer?.name || ""}
                </td>
                <td className="border border-black p-2 text-xs font-semibold text-left">
                  {report?.content || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex justify-between items-end mt-auto mb-24 px-4 font-bold text-sm">
          <div>APPROVED</div>
          <div>DSM/DDSM</div>
          <div>SR.BM/BM</div>
        </div>
      </div>
    </div>
  );
}
