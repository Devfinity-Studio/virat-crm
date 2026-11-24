import { z } from "zod";
import {
  createTRPCRouter,
  featureProtectedProcedure,
  featureManagerProcedure,
} from "@/server/api/trpc";
import { dailyReports, users, userManagers, customers } from "@/server/db/schema";
import { eq, and, desc, sql, inArray, gte, lte, ilike, exists, or, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { resolveReportTargetUsers } from "@/server/lib/reports";

export const dailyReportsRouter = createTRPCRouter({
  submitReport: featureProtectedProcedure("reports")
    .input(
      z.object({
        content: z.string().min(10, "Report content too short"),
        reportDate: z.date().optional(),
        timeFrom: z.string().optional(),
        timeTo: z.string().optional(),
        customerId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, dbUser } = ctx;
      if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

      let branchId = dbUser.branchId;
      if (!branchId) {
        // Fallback for global Admins without a specific branch assignment
        const firstBranch = await db.query.branches.findFirst();
        if (firstBranch) {
          branchId = firstBranch.id;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No branches available to assign the report to.",
          });
        }
      }

      return await db
        .insert(dailyReports)
        .values({
          userId: dbUser.id,
          branchId: branchId,
          reportDate: input.reportDate ?? new Date(),
          timeFrom: input.timeFrom,
          timeTo: input.timeTo,
          content: input.content,
          customerId: input.customerId,
        })
        .returning();
    }),

  listMyReports: featureProtectedProcedure("reports")
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, dbUser } = ctx;
      if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

      return await db.query.dailyReports.findMany({
        where: eq(dailyReports.userId, dbUser.id),
        orderBy: [desc(dailyReports.reportDate)],
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
          customer: {
            columns: {
              name: true,
            },
          },
        },
      });
    }),

  listScopedReports: featureProtectedProcedure("reports")
    .input(
      z.object({
        scope: z.enum(["all", "individual", "team", "management", "branch"]).default("all"),
        targetId: z.string().uuid().optional(),
        branchId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, dbUser } = ctx;
      if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

      const filters: SQL[] = [];

      // 1. Role-based scoping
      if (dbUser.role === "Employee") {
        // Employees can strictly only access their own reports
        filters.push(eq(dailyReports.userId, dbUser.id));
      } else if (dbUser.role === "Manager") {
        if (input.scope === "individual" && (!input.targetId || input.targetId === dbUser.id)) {
          // Viewing own submissions
          filters.push(eq(dailyReports.userId, dbUser.id));
        } else if (input.targetId) {
          // Specific employee targeted
          filters.push(eq(dailyReports.userId, input.targetId));
        } else {
          // Manager viewing team/branch reports
          // Check if explicit subordinates exist in user_managers
          const subordinates = await db.query.userManagers.findMany({
            where: eq(userManagers.managerId, dbUser.id),
          });

          if (subordinates.length > 0) {
            const subIds = subordinates.map((s) => s.userId);
            filters.push(inArray(dailyReports.userId, [...subIds, dbUser.id]));
          } else if (dbUser.branchId) {
            // If no explicit user_managers hierarchy rows, scope to manager's branch
            filters.push(eq(dailyReports.branchId, dbUser.branchId));
          } else {
            filters.push(eq(dailyReports.userId, dbUser.id));
          }
        }
      } else {
        // Admin & Developer: Full Access across organization
        if (input.targetId) {
          filters.push(eq(dailyReports.userId, input.targetId));
        } else if (input.branchId) {
          filters.push(eq(dailyReports.branchId, input.branchId));
        } else if (input.scope === "individual") {
          filters.push(eq(dailyReports.userId, dbUser.id));
        }
        // If scope === "all" or no targetId/branchId/individual, shows all reports!
      }

      // 2. Date filters
      if (input.startDate) {
        const startOfDay = new Date(input.startDate);
        startOfDay.setHours(0, 0, 0, 0);
        filters.push(gte(dailyReports.reportDate, startOfDay));
      }

      if (input.endDate) {
        const endOfDay = new Date(input.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filters.push(lte(dailyReports.reportDate, endOfDay));
      }

      // 3. Search query filter
      const search = input.search?.trim();
      let searchCondition: SQL | undefined = undefined;

      if (search && search.length > 0) {
        const term = `%${search}%`;
        searchCondition = or(
          ilike(dailyReports.content, term),
          exists(
            db
              .select()
              .from(users)
              .where(
                and(
                  eq(users.id, dailyReports.userId),
                  or(
                    ilike(users.firstName, term),
                    ilike(users.lastName, term),
                    ilike(users.employeeCode, term),
                    sql`concat(${users.firstName}, ' ', ${users.lastName}) ILIKE ${term}`,
                  ),
                ),
              ),
          ),
          exists(
            db
              .select()
              .from(customers)
              .where(
                and(
                  eq(customers.id, dailyReports.customerId),
                  ilike(customers.name, term),
                ),
              ),
          ),
        );
      }

      const whereClause = searchCondition
        ? and(...filters, searchCondition)
        : filters.length > 0
          ? and(...filters)
          : undefined;

      return await db.query.dailyReports.findMany({
        where: whereClause,
        orderBy: [desc(dailyReports.reportDate)],
        limit: input.limit,
        offset: input.offset,
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          branch: {
            columns: {
              id: true,
              name: true,
            },
          },
          customer: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  listBranchReports: featureManagerProcedure("reports")
    .input(
      z
        .object({
          date: z.date().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, dbUser } = ctx;
      if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

      const filters: SQL[] = [eq(dailyReports.branchId, dbUser.branchId!)];

      if (input?.date) {
        const startOfDay = new Date(input.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(input.date);
        endOfDay.setHours(23, 59, 59, 999);

        filters.push(
          sql`${dailyReports.reportDate} >= ${startOfDay} AND ${dailyReports.reportDate} <= ${endOfDay}`,
        );
      }

      return await db.query.dailyReports.findMany({
        where: and(...filters),
        orderBy: [desc(dailyReports.reportDate)],
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
          customer: {
            columns: {
              name: true,
            },
          },
        },
      });
    }),
});
