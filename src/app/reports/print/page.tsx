import { redirect } from "next/navigation";
import { getSession } from "@/server/lib/auth";
import { api } from "@/trpc/server";
import { format } from "date-fns";
import Image from "next/image";

export default async function DailyReportPrintView({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; userId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const dateStr = resolvedSearchParams.date ?? format(new Date(), "yyyy-MM-dd");
  const userId = resolvedSearchParams.userId ?? session.userId;

  const targetDate = new Date(dateStr);

  const myProfile = await api.users.getMe();
  
  const reports = await api.dailyReports.listScopedReports({
    scope: userId === session.userId ? "individual" : "management",
    targetId: userId,
    limit: 100,
  });

  const targetDateString = format(targetDate, "yyyy-MM-dd");
  const daysReports = reports.filter(
    (r) => format(r.reportDate, "yyyy-MM-dd") === targetDateString
  );

  const reportRows = [...daysReports];
  while (reportRows.length < 10) {
    reportRows.push(null as any);
  }
  const visibleRows = reportRows.slice(0, 10);

  let targetUser = myProfile;
  if (userId !== myProfile?.id && daysReports.length > 0) {
    targetUser = {
      ...myProfile, // Fallback
      firstName: daysReports[0]?.user?.firstName || "",
      lastName: daysReports[0]?.user?.lastName || "",
      // @ts-ignore
      employeeCode: daysReports[0].user.employeeCode || "",
      // @ts-ignore
      role: daysReports[0].user.role || "",
    } as any;
  }
  
  const branches = await api.inventory.getBranches();
  const userBranch = branches.find((b: any) => b.id === targetUser?.branchId);

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:bg-white print:p-0 flex justify-center">
      <div className="w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-lg print:shadow-none print:w-auto print:min-h-0 print:p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0.5cm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}} />
        
        {/* Main Border Container */}
        <div className="border-[2px] border-black">
          
          {/* Header Row */}
          <div className="flex border-b-[2px] border-black pb-2 items-start p-2">
            <div className="w-[120px] pt-1">
              <Image src="/logo-removebg-preview.png" alt="Logo" width={100} height={60} className="object-contain" priority />
            </div>
            <div className="flex-1 text-center pt-2">
              <h1 className="text-xl font-bold font-sans">DAILY ACTIVITY REPORT BM & ABOVE</h1>
            </div>
            <div className="w-[120px]" /> {/* Spacer for balance */}
          </div>

          {/* User Details */}
          <div className="px-2 py-3 text-sm font-bold flex flex-col gap-2 border-b-[2px] border-black pb-4">
            <div className="flex items-end gap-2">
              <span className="w-16">NAME:</span>
              <div className="flex-1 border-b-[1.5px] border-black pb-0.5 font-semibold uppercase">
                {targetUser?.firstName} {targetUser?.lastName}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-16">DEG:</span>
              <div className="flex-1 border-b-[1.5px] border-black pb-0.5 max-w-[200px] font-semibold uppercase">
                {targetUser?.role}
              </div>
              <span className="ml-4">BRANCH:</span>
              <div className="flex-1 border-b-[1.5px] border-black pb-0.5 font-semibold uppercase">
                {userBranch?.name || ""}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-20">E CODE:</span>
              <div className="w-[150px] border-b-[1.5px] border-black pb-0.5 font-semibold uppercase">
                {targetUser?.employeeCode}
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-center text-sm font-bold border-collapse">
            <thead>
              <tr className="bg-slate-300">
                <th rowSpan={2} className="border border-black p-2 w-[40px]">SL</th>
                <th rowSpan={2} className="border border-black p-2 w-[100px]">DATE</th>
                <th colSpan={2} className="border border-black p-1">TIME</th>
                <th rowSpan={2} className="border border-black p-2 w-[130px]">PLACE</th>
                <th rowSpan={2} className="border border-black p-2">NATURE OF WORK</th>
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
                    {report ? format(report.reportDate, "dd-MMM-yyyy") : ""}
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
