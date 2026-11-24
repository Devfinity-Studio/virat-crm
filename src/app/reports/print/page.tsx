import { redirect } from "next/navigation";
import { getSession } from "@/server/lib/auth";
import { api } from "@/trpc/server";
import { VIRAT_LOGO_BASE64 } from "@/lib/constants/logo-base64";
import { PrintToolbar } from "./PrintButton";

function formatReportDate(d: string | Date): string {
  const dateObj = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
    .format(dateObj)
    .replace(/ /g, "-");
}

export default async function DailyReportPrintView({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; userId?: string; mode?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const isFilled = resolvedSearchParams.mode === "filled";
  const dateStr =
    resolvedSearchParams.date ??
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const userId = resolvedSearchParams.userId ?? session.userId;

  let targetUser: any = null;
  let userBranch: any = null;
  let daysReports: any[] = [];

  if (isFilled) {
    const myProfile = await api.users.getMe();
    const reports = await api.dailyReports.listScopedReports({
      scope: "all",
      targetId: userId,
      limit: 100,
    });

    const targetDateString = dateStr.slice(0, 10);
    daysReports = reports.filter(
      (r) =>
        new Date(r.reportDate).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        }) === targetDateString,
    );

    targetUser = myProfile;
    if (userId !== myProfile?.id && daysReports.length > 0) {
      targetUser = {
        ...myProfile,
        firstName: daysReports[0]?.user?.firstName || "",
        lastName: daysReports[0]?.user?.lastName || "",
        employeeCode: daysReports[0]?.user?.employeeCode || "",
        role: daysReports[0]?.user?.role || "",
      };
    }

    const branches = await api.inventory.getBranches();
    userBranch = branches.find((b: any) => b.id === targetUser?.branchId);
  }

  // 10 visible rows
  const visibleRows = isFilled
    ? [...daysReports, ...Array(Math.max(0, 10 - daysReports.length)).fill(null)].slice(0, 10)
    : Array(10).fill(null);

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:bg-white print:p-0 flex flex-col items-center">
      <PrintToolbar isFilled={isFilled} />

      <div className="w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-lg print:shadow-none print:w-auto print:min-h-0 print:p-0">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            @page { margin: 0.5cm; size: A4 portrait; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `,
          }}
        />

        {/* Main Border Container */}
        <div className="border-[2px] border-black">
          {/* Header Row */}
          <div className="flex border-b-[2px] border-black pb-2 items-start p-2">
            <div className="w-[120px] pt-1">
              <img
                src={VIRAT_LOGO_BASE64}
                alt="Logo"
                width={100}
                height={60}
                className="object-contain"
              />
            </div>
            <div className="flex-1 text-center pt-2">
              <h1 className="text-xl font-bold font-sans">
                DAILY ACTIVITY REPORT BM &amp; ABOVE
              </h1>
            </div>
            <div className="w-[120px]" /> {/* Spacer for balance */}
          </div>

          {/* User Details */}
          <div className="px-2 py-3 text-sm font-bold flex flex-col gap-2 border-b-[2px] border-black pb-4">
            <div className="flex items-end gap-2">
              <span className="w-16">NAME:</span>
              <div className="flex-1 border-b-[1.5px] border-black pb-0.5 font-semibold uppercase min-h-[22px]">
                {isFilled && targetUser
                  ? `${targetUser.firstName} ${targetUser.lastName}`
                  : ""}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-16">DEG:</span>
              <div className="flex-1 border-b-[1.5px] border-black pb-0.5 max-w-[200px] font-semibold uppercase min-h-[22px]">
                {isFilled && targetUser ? targetUser.role : ""}
              </div>
              <span className="ml-4">BRANCH:</span>
              <div className="flex-1 border-b-[1.5px] border-black pb-0.5 font-semibold uppercase min-h-[22px]">
                {isFilled && userBranch ? userBranch.name : ""}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-20">E CODE:</span>
              <div className="w-[150px] border-b-[1.5px] border-black pb-0.5 font-semibold uppercase min-h-[22px]">
                {isFilled && targetUser ? targetUser.employeeCode : ""}
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
                <th className="border border-black p-1 w-[70px] text-xs">
                  FROM
                </th>
                <th className="border border-black p-1 w-[70px] text-xs">
                  TO
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((report, index) => (
                <tr key={index} className="h-[58px]">
                  <td className="border border-black p-2">{index + 1}</td>
                  <td className="border border-black p-2 text-xs font-semibold">
                    {report ? formatReportDate(report.reportDate) : ""}
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
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end mt-24 px-4 font-bold text-sm">
          <div>APPROVED</div>
          <div>DSM/DDSM</div>
          <div>SR.BM/BM</div>
        </div>
      </div>
    </div>
  );
}
