import { z } from "zod";
import {
  createTRPCRouter,
  featureProtectedProcedure,
  featureManagerProcedure,
} from "@/server/api/trpc";
import { dailyReports, users, userManagers } from "@/server/db/schema";
import { eq, and, desc, sql, inArray, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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
        scope: z.enum(["individual", "team", "management", "branch"]),
        targetId: z.string().uuid().optional(),
        branchId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, dbUser } = ctx;
      if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

      let targetUserIds: string[] = [];
      const effectiveId = input.targetId ?? dbUser.id;

      if (input.scope === "individual") {
        targetUserIds = [effectiveId];
      } else if (input.scope === "team") {
        const teamMappings = await db.query.userManagers.findMany({
          where: eq(userManagers.managerId, effectiveId),
        });
        targetUserIds = teamMappings.map((m) => m.userId);
      } else if (input.scope === "branch") {
        if (dbUser.role !== "Admin") throw new TRPCError({ code: "FORBIDDEN" });
        const branchUsers = await db.query.users.findMany({
          where: eq(users.branchId, input.branchId!),
          columns: { id: true },
        });
        targetUserIds = branchUsers.map((u) => u.id);
      } else if (input.scope === "management") {
        const descendantsQuery = sql`
          WITH RECURSIVE subordinates AS (
            SELECT user_id as id FROM "virat-crm_user_managers" WHERE manager_id = ${effectiveId}
            UNION
            SELECT um.user_id as id FROM "virat-crm_user_managers" um
            INNER JOIN subordinates s ON s.id = um.manager_id
          )
          SELECT id FROM subordinates;
        `;
        const rows = (await db.execute(descendantsQuery)) as unknown as { id: string }[];
        targetUserIds = rows.map((r) => String(r.id));
      }

      if (targetUserIds.length === 0 && input.scope !== "individual") {
        return [];
      }

      const filters: SQL[] = [inArray(dailyReports.userId, targetUserIds)];

      if (input.startDate) {
        const startOfDay = new Date(input.startDate);
        startOfDay.setHours(0, 0, 0, 0);
        filters.push(sql`${dailyReports.reportDate} >= ${startOfDay}`);
      }

      if (input.endDate) {
        const endOfDay = new Date(input.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filters.push(sql`${dailyReports.reportDate} <= ${endOfDay}`);
      }

      return await db.query.dailyReports.findMany({
        where: and(...filters),
        orderBy: [desc(dailyReports.reportDate)],
        limit: input.limit,
        offset: input.offset,
        with: {
          user: {
            columns: {
              id: true,
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
