import { z } from "zod";
import { createTRPCRouter, featureProtectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  sales,
  branches,
  locationLogs,
  users,
  dailyMileage,
  saleAssignments,
  userManagers,
  replacements,
} from "@/server/db/schema";
import { and, gte, lte, eq, sql, inArray, gt, desc } from "drizzle-orm";
import { getDateRange } from "@/server/lib/date";
import { resolveReportTargetUsers } from "@/server/lib/reports";

export const reportsRouter = createTRPCRouter({
  // Fetch users for selection (Admins & Devs see everyone, Managers see their team subtree, Employees see none)
  getSelectableUsers: featureProtectedProcedure("reports").query(
    async ({ ctx }) => {
      const currentUser = ctx.dbUser;

      if (currentUser.role === "Admin" || currentUser.role === "Developer") {
        return ctx.db.query.users.findMany({
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            employeeCode: true,
          },
        });
      }

      if (currentUser.role === "Employee") {
        // REP-01: Employees can only view themselves; no selectable users
        return [];
      }

      // REP-02: Manager case: recursive subordinate hierarchy tree via user_managers
      const descendantsQuery = sql`
        WITH RECURSIVE subordinates AS (
          SELECT user_id as id FROM "virat-crm_user_managers" WHERE manager_id = ${currentUser.id}
          UNION
          SELECT um.user_id as id FROM "virat-crm_user_managers" um
          INNER JOIN subordinates s ON s.id = um.manager_id
        )
        SELECT id FROM subordinates;
      `;
      const rows = (await ctx.db.execute(descendantsQuery)) as unknown as {
        id: string;
      }[];
      const teamIds = rows.map((r) => String(r.id));
      if (teamIds.length === 0) return [];

      return ctx.db.query.users.findMany({
        where: inArray(users.id, teamIds),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          employeeCode: true,
        },
      });
    },
  ),

  getReportData: featureProtectedProcedure("reports")
    .input(
      z.object({
        preset: z.enum(["today", "7d", "30d", "quarter", "year", "all"]),
        scope: z.enum(["individual", "team", "management", "branch"]),
        targetId: z.string().uuid().optional(),
        branchId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = getDateRange(input.preset);

      // 1. Identify Target Users based on Scope (enforcing REP-01, REP-02, REP-03)
      const targetUserIds = await resolveReportTargetUsers(ctx, input);

      if (targetUserIds.length === 0 && input.scope !== "individual") {
        return {
          sales: [],
          attendance: [],
          summary: { revenue: 0, balance: 0, orders: 0, visits: 0 },
        };
      }

      // 2. Fetch Sales Data
      const salesData = await ctx.db
        .select({
          orderNumber: sales.orderNumber,
          customerName: sales.customerName,
          invoiceAmount: sales.invoiceAmount,
          balanceAmount: sales.balanceAmount,
          status: sales.status,
          date: sales.createdAt,
          branchName: branches.name,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        })
        .from(sales)
        .innerJoin(branches, eq(sales.branchId, branches.id))
        .innerJoin(
          saleAssignments,
          and(
            eq(sales.id, saleAssignments.saleId),
            eq(saleAssignments.role, "Employee"),
          ),
        )
        .innerJoin(users, eq(saleAssignments.userId, users.id))
        .where(
          and(
            inArray(saleAssignments.userId, targetUserIds),
            gte(sales.createdAt, start),
            lte(sales.createdAt, end),
          ),
        );

      // 3. Fetch Attendance/Visits
      const attendanceData = await ctx.db
        .select({
          id: locationLogs.id,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          date: locationLogs.date,
          slab: locationLogs.slab,
          latitude: locationLogs.latitude,
          longitude: locationLogs.longitude,
          locationName: locationLogs.locationName,
          recordedAt: locationLogs.recordedAt,
        })
        .from(locationLogs)
        .innerJoin(users, eq(locationLogs.userId, users.id))
        .where(
          and(
            inArray(locationLogs.userId, targetUserIds),
            gte(locationLogs.recordedAt, start),
            lte(locationLogs.recordedAt, end),
          ),
        );

      // 4. Yearly Aggregation (for Lifetime reports)
      let yearlyStats: {
        year: number;
        revenue: number;
        balance: number;
        orders: number;
        visits: number;
      }[] = [];
      if (input.preset === "all") {
        const years = new Set<number>();
        salesData.forEach((s) => years.add(new Date(s.date).getFullYear()));
        attendanceData.forEach((a) =>
          years.add(new Date(a.recordedAt).getFullYear()),
        );

        yearlyStats = Array.from(years)
          .sort((a, b) => b - a)
          .map((year) => {
            const yearSales = salesData.filter(
              (s) => new Date(s.date).getFullYear() === year,
            );
            const yearAttendance = attendanceData.filter(
              (a) => new Date(a.recordedAt).getFullYear() === year,
            );

            return {
              year,
              revenue: yearSales.reduce(
                (acc, s) => acc + parseFloat(s.invoiceAmount),
                0,
              ),
              balance: yearSales.reduce(
                (acc, s) => acc + parseFloat(s.balanceAmount),
                0,
              ),
              orders: yearSales.length,
              visits: yearAttendance.length,
            };
          });
      }

      // 5. Summarize
      const summary = {
        revenue: salesData.reduce(
          (acc, s) => acc + parseFloat(s.invoiceAmount),
          0,
        ),
        balance: salesData.reduce(
          (acc, s) => acc + parseFloat(s.balanceAmount),
          0,
        ),
        orders: salesData.length,
        visits: attendanceData.length,
      };

      return {
        sales: salesData,
        attendance: attendanceData,
        yearlyStats,
        summary,
      };
    }),

  getMileageReport: featureProtectedProcedure("reports")
    .input(
      z.object({
        preset: z.enum(["today", "7d", "30d", "quarter", "year", "all"]),
        scope: z.enum(["individual", "team", "management", "branch"]),
        targetId: z.string().uuid().optional(),
        branchId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = getDateRange(input.preset);

      // 1. Identify Target Users based on Scope (enforcing REP-01, REP-02, REP-03)
      const targetUserIds = await resolveReportTargetUsers(ctx, input);

      if (targetUserIds.length === 0 && input.scope !== "individual") {
        return { records: [], totalKm: 0 };
      }

      // Convert start and end dates to YYYY-MM-DD strings for filtering `daily_mileage.date`
      const startDateStr = start.toISOString().split("T")[0]!;
      const endDateStr = end.toISOString().split("T")[0]!;

      const mileageData = await ctx.db
        .select({
          id: dailyMileage.id,
          date: dailyMileage.date,
          totalDistanceMeters: dailyMileage.totalDistanceMeters,
          validPointsCount: dailyMileage.validPointsCount,
          userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          employeeCode: users.employeeCode,
        })
        .from(dailyMileage)
        .innerJoin(users, eq(dailyMileage.userId, users.id))
        .where(
          and(
            inArray(dailyMileage.userId, targetUserIds),
            gte(dailyMileage.date, startDateStr),
            lte(dailyMileage.date, endDateStr),
          ),
        );

      let totalKm = 0;
      const records = mileageData.map((m) => {
        const km = parseFloat(m.totalDistanceMeters) / 1000;
        totalKm += km;
        return {
          ...m,
          totalDistanceKm: parseFloat(km.toFixed(2)),
        };
      });

      return {
        records,
        totalKm: parseFloat(totalKm.toFixed(2)),
      };
    }),

  getSalesForecast: featureProtectedProcedure("reports")
    .input(
      z.object({
        scope: z.enum(["individual", "team", "management", "branch"]),
        targetId: z.string().uuid().optional(),
        branchId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 1. Identify Target Users based on Scope (enforcing REP-01, REP-02, REP-03)
      const targetUserIds = await resolveReportTargetUsers(ctx, input);

      if (targetUserIds.length === 0 && input.scope !== "individual") {
        return {
          history: [],
          forecast: [],
          stats: { trend: 0, confidence: 50, nextMonthRevenue: 0 },
        };
      }

      // Query historical sales for the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      twelveMonthsAgo.setDate(1);
      twelveMonthsAgo.setHours(0, 0, 0, 0);

      const salesData = await ctx.db
        .select({
          invoiceAmount: sales.invoiceAmount,
          date: sales.createdAt,
        })
        .from(sales)
        .innerJoin(
          saleAssignments,
          and(
            eq(sales.id, saleAssignments.saleId),
            eq(saleAssignments.role, "Employee"),
          ),
        )
        .where(
          and(
            inArray(saleAssignments.userId, targetUserIds),
            gte(sales.createdAt, twelveMonthsAgo),
          ),
        );

      // Group sales by month
      const salesByMonth = new Map<string, number>();
      const monthsList: { label: string; key: string; date: Date }[] = [];
      const current = new Date();

      for (let i = 11; i >= 0; i--) {
        const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        monthsList.push({ label, key, date: d });
        salesByMonth.set(key, 0);
      }

      for (const sale of salesData) {
        const d = new Date(sale.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (salesByMonth.has(key)) {
          salesByMonth.set(
            key,
            salesByMonth.get(key)! + parseFloat(sale.invoiceAmount),
          );
        }
      }

      const history = monthsList.map((m, idx) => ({
        index: idx,
        period: m.label,
        revenue: salesByMonth.get(m.key) ?? 0,
      }));

      // Time-series Forecasting using Linear Regression
      const N = history.length;
      const sumX = history.reduce((acc, h) => acc + h.index, 0);
      const sumY = history.reduce((acc, h) => acc + h.revenue, 0);
      const meanX = sumX / N;
      const meanY = sumY / N;

      let num = 0;
      let den = 0;
      for (const h of history) {
        num += (h.index - meanX) * (h.revenue - meanY);
        den += Math.pow(h.index - meanX, 2);
      }

      const slope = den === 0 ? 0 : num / den;
      const intercept = meanY - slope * meanX;

      // Standard Error of Estimate
      let sumSqResiduals = 0;
      let sumSqTotal = 0;
      for (const h of history) {
        const predicted = slope * h.index + intercept;
        sumSqResiduals += Math.pow(h.revenue - predicted, 2);
        sumSqTotal += Math.pow(h.revenue - meanY, 2);
      }

      const standardError = N > 2 ? Math.sqrt(sumSqResiduals / (N - 2)) : 0;

      // Coefficient of determination (R^2)
      const rSquared = sumSqTotal === 0 ? 1 : 1 - sumSqResiduals / sumSqTotal;
      const confidence = Math.min(99, Math.max(50, Math.round(rSquared * 100)));

      // Generate forecast for next 3 periods
      const forecast: {
        period: string;
        revenue: number;
        optimistic: number;
        pessimistic: number;
      }[] = [];
      const nextMonthDate = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        1,
      );

      for (let i = 0; i < 3; i++) {
        const futureDate = new Date(
          nextMonthDate.getFullYear(),
          nextMonthDate.getMonth() + i,
          1,
        );
        const label = futureDate.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        const futureIndex = N + i;
        const predicted = Math.max(0, slope * futureIndex + intercept);

        // Standard error escalates over time (error increases further out)
        const errorMultiplier = 1.96 + 0.3 * i;
        const margin = standardError * errorMultiplier;

        forecast.push({
          period: label,
          revenue: Math.round(predicted),
          optimistic: Math.round(predicted + margin),
          pessimistic: Math.round(Math.max(0, predicted - margin)),
        });
      }

      const trend = meanY === 0 ? 0 : Math.round((slope / meanY) * 100);

      return {
        history: history.map((h) => ({
          period: h.period,
          revenue: Math.round(h.revenue),
        })),
        forecast,
        stats: {
          trend,
          confidence,
          nextMonthRevenue: forecast[0]?.revenue ?? 0,
        },
      };
    }),

  seedFakeLocationLogs: featureProtectedProcedure("reports")
    .input(z.object({ targetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin")
        throw new TRPCError({ code: "FORBIDDEN" });
      const slabs = [
        "00:00-10:00",
        "10:00-14:00",
        "14:00-18:00",
        "18:00-21:00",
      ];
      const locations = [
        "Main Branch",
        "Client Office",
        "Warehouse A",
        "Field Visit",
      ];
      const now = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      );
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      for (let i = 0; i < slabs.length; i++) {
        const slab = slabs[i]!;
        const locName = locations[i]!;
        /* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
        await ctx.db
          .insert(locationLogs)
          .values({
            userId: input.targetId,
            date: dateStr,
            slab,
            latitude: "28.6139", // New Delhi coordinates
            longitude: "77.2090",
            locationName: locName,
            frequencyMap: { "28.6139,77.2090": 10 },
            recordedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [locationLogs.userId, locationLogs.date, locationLogs.slab],
            set: {
              locationName: locName,
              latitude: "28.6139",
              longitude: "77.2090",
            },
          });
        /* eslint-enable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
      }
      return { success: true };
    }),

  exportReportsCSV: featureProtectedProcedure("reports")
    .input(z.object({ scope: z.string(), preset: z.string() }))
    .mutation(async ({ ctx }) => {
      // Stub implementation: usually we'd call getReportData directly
      // Here we just return a base64 encoded dummy CSV to simulate the export
      const dummyCSV = `Date,Order,Revenue\n2026-05-30,ORD-001,150.00\n`;
      return { csvBase64: Buffer.from(dummyCSV).toString("base64") };
    }),

  exportReportsPDF: featureProtectedProcedure("reports")
    .input(z.object({ scope: z.string(), preset: z.string() }))
    .mutation(async ({ ctx }) => {
      // Stub implementation: return dummy base64 PDF
      // A full implementation would use pdfmake here
      const dummyPDF = `%PDF-1.4\n1 0 obj\n<< /Title (Report) >>\nendobj\n`;
      return { pdfBase64: Buffer.from(dummyPDF).toString("base64") };
    }),

  getAdvanceRegister: featureProtectedProcedure("reports")
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.number().nullish(), // cursor is sale.id
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;
      const currentUser = ctx.dbUser;
      const isPrivileged = currentUser.role === "Admin" || currentUser.role === "Developer";

      const whereConditions: any[] = [
        gt(sales.advancePaymentAmount, "0"),
        cursor ? sql`${sales.id} < ${cursor}` : undefined,
      ];

      // REP-01 & REP-02: Employees only see their own sales; Managers see their branch
      if (!isPrivileged) {
        if (currentUser.role === "Employee") {
          whereConditions.push(eq(sales.userId, currentUser.id));
        } else if (currentUser.role === "Manager" && currentUser.branchId) {
          whereConditions.push(eq(sales.branchId, currentUser.branchId));
        }
      }

      const items = await ctx.db.query.sales.findMany({
        where: and(...whereConditions),
        limit: limit + 1,
        with: {
          user: true,
          branch: true,
        },
        orderBy: [desc(sales.id)],
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  getReplacementRegister: featureProtectedProcedure("reports")
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.number().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;
      const currentUser = ctx.dbUser;
      const isPrivileged = currentUser.role === "Admin" || currentUser.role === "Developer";

      const whereConditions: any[] = [
        cursor ? sql`${replacements.id} < ${cursor}` : undefined,
      ];

      // REP-01 & REP-02: Employees only see their own replacements; Managers see their branch
      if (!isPrivileged) {
        if (currentUser.role === "Employee") {
          whereConditions.push(eq(replacements.userId, currentUser.id));
        } else if (currentUser.role === "Manager" && currentUser.branchId) {
          whereConditions.push(eq(replacements.branchId, currentUser.branchId));
        }
      }

      const items = await ctx.db.query.replacements.findMany({
        where: and(...whereConditions),
        limit: limit + 1,
        with: {
          user: true,
          branch: true,
          sale: true,
        },
        orderBy: [desc(replacements.id)],
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),
});
