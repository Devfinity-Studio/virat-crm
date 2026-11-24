import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { systemSettings } from "@/server/db/schema/systemSettings";
import { users } from "@/server/db/schema/users";
import { systemAuditLogs } from "@/server/db/schema/systemAuditLogs";
import { ipBlocks } from "@/server/db/schema/ipBlocks";
import { eq, and, or, ilike, desc, lt, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logSystemEvent } from "@/server/lib/audit-logger";

// Local Developer-only middleware
const developerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.dbUser?.role !== "Developer") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the sovereign System Developer can access these controls.",
    });
  }
  return next();
});

export const developerRouter = createTRPCRouter({
  getSettings: developerProcedure.query(async ({ ctx }) => {
    return ctx.settings;
  }),

  updateSettings: developerProcedure
    .input(
      z.object({
        maxUsers: z.number().min(1).max(10000),
        isSystemLocked: z.boolean(),
        isReadOnly: z.boolean(),
        disabledFeaturesGlobal: z.array(z.string()),
        forceUpdateEnabled: z.boolean().optional(),
        minAppVersionCode: z.number().int().min(1).optional(),
        latestAppVersionCode: z.number().int().min(1).optional(),
        minAppVersionName: z.string().max(32).optional(),
        latestAppVersionName: z.string().max(32).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        maxUsers: input.maxUsers,
        isSystemLocked: input.isSystemLocked,
        isReadOnly: input.isReadOnly,
        disabledFeaturesGlobal: input.disabledFeaturesGlobal,
        updatedAt: new Date(),
      };

      if (input.forceUpdateEnabled !== undefined) {
        updateData.forceUpdateEnabled = input.forceUpdateEnabled;
      }
      if (input.minAppVersionCode !== undefined) {
        updateData.minAppVersionCode = input.minAppVersionCode;
      }
      if (input.latestAppVersionCode !== undefined) {
        updateData.latestAppVersionCode = input.latestAppVersionCode;
      }
      if (input.minAppVersionName !== undefined) {
        updateData.minAppVersionName = input.minAppVersionName;
      }
      if (input.latestAppVersionName !== undefined) {
        updateData.latestAppVersionName = input.latestAppVersionName;
      }

      const [updated] = await ctx.db
        .update(systemSettings)
        .set(updateData)
        .where(eq(systemSettings.id, "global"))
        .returning();

      await logSystemEvent({
        eventType: "DEVELOPER_ACTION",
        action: "System Configuration Updated",
        status: "INFO",
        userId: ctx.dbUser.id,
        userName: `${ctx.dbUser.firstName} ${ctx.dbUser.lastName}`,
        userEmail: ctx.dbUser.email,
        userRole: ctx.dbUser.role,
        details: `Updated system controls (ForceUpdate: ${input.forceUpdateEnabled ?? "unchanged"}, Locked: ${input.isSystemLocked}, ReadOnly: ${input.isReadOnly})`,
        metadata: input,
      });

      return updated;
    }),

  deleteAccount: developerProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.dbUser.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own System Developer account.",
        });
      }

      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      // Perform a clean database delete
      await ctx.db.delete(users).where(eq(users.id, input.userId));

      await logSystemEvent({
        eventType: "DEVELOPER_ACTION",
        action: "User Account Purged",
        status: "WARNING",
        userId: ctx.dbUser.id,
        userName: `${ctx.dbUser.firstName} ${ctx.dbUser.lastName}`,
        userEmail: ctx.dbUser.email,
        userRole: ctx.dbUser.role,
        details: `Permanently purged user ${targetUser.firstName} ${targetUser.lastName} (${targetUser.employeeCode}, ${targetUser.email})`,
        metadata: {
          targetUserId: targetUser.id,
          targetEmployeeCode: targetUser.employeeCode,
          targetUserEmail: targetUser.email,
        },
      });

      return { success: true };
    }),

  getAuditLogs: developerProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        eventType: z
          .enum([
            "ALL",
            "LOGIN_SUCCESS",
            "LOGIN_FAILURE",
            "LOGOUT",
            "LOCATION_ALERT",
            "SYSTEM_ERROR",
            "DEVELOPER_ACTION",
          ])
          .default("ALL"),
        status: z
          .enum(["ALL", "SUCCESS", "FAILURE", "WARNING", "INFO"])
          .default("ALL"),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, eventType, status, search } = input;

      const conditions = [];

      if (eventType !== "ALL") {
        conditions.push(eq(systemAuditLogs.eventType, eventType));
      }

      if (status !== "ALL") {
        conditions.push(eq(systemAuditLogs.status, status));
      }

      if (search && search.trim().length > 0) {
        const q = `%${search.trim().toLowerCase()}%`;
        conditions.push(
          or(
            ilike(systemAuditLogs.userName, q),
            ilike(systemAuditLogs.userEmail, q),
            ilike(systemAuditLogs.employeeCode, q),
            ilike(systemAuditLogs.action, q),
            ilike(systemAuditLogs.details, q),
            ilike(systemAuditLogs.ipAddress, q),
          ),
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await ctx.db
        .select()
        .from(systemAuditLogs)
        .where(whereClause)
        .orderBy(desc(systemAuditLogs.createdAt))
        .limit(limit);

      return logs;
    }),

  clearAuditLogs: developerProcedure
    .input(
      z.object({
        olderThanDays: z.number().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.olderThanDays === 0) {
        await ctx.db.delete(systemAuditLogs);
      } else {
        const cutoff = new Date(
          Date.now() - input.olderThanDays * 24 * 60 * 60 * 1000,
        );
        await ctx.db
          .delete(systemAuditLogs)
          .where(lt(systemAuditLogs.createdAt, cutoff));
      }

      await logSystemEvent({
        eventType: "DEVELOPER_ACTION",
        action: "Audit Logs Cleared",
        status: "WARNING",
        userId: ctx.dbUser.id,
        userName: `${ctx.dbUser.firstName} ${ctx.dbUser.lastName}`,
        userEmail: ctx.dbUser.email,
        userRole: ctx.dbUser.role,
        details: `Purged audit logs ${input.olderThanDays === 0 ? "completely" : `older than ${input.olderThanDays} days`}`,
      });

      return { success: true };
    }),

  getBlockedEntities: developerProcedure.query(async ({ ctx }) => {
    const now = new Date();

    // 1. Fetch currently blocked or high-attempt IPs
    const allIpBlocks = await ctx.db
      .select()
      .from(ipBlocks)
      .orderBy(desc(ipBlocks.lastAttemptAt));

    const blockedIps = allIpBlocks.map((record) => {
      const isBlocked =
        !!record.blockedUntil && record.blockedUntil.getTime() > now.getTime();
      const minutesRemaining = isBlocked
        ? Math.ceil((record.blockedUntil!.getTime() - now.getTime()) / 60000)
        : 0;

      return {
        ...record,
        isBlocked,
        minutesRemaining,
      };
    });

    // 2. Fetch locked user accounts
    const allUsers = await ctx.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        employeeCode: users.employeeCode,
        role: users.role,
        isActive: users.isActive,
        failedLoginAttempts: users.failedLoginAttempts,
        accountLockedUntil: users.accountLockedUntil,
        lockoutReason: users.lockoutReason,
      })
      .from(users)
      .where(
        or(
          gt(users.failedLoginAttempts, 0),
          gt(users.accountLockedUntil, now),
        ),
      );

    const lockedUsers = allUsers.map((u) => {
      const isLocked =
        !!u.accountLockedUntil && u.accountLockedUntil.getTime() > now.getTime();
      const minutesRemaining = isLocked
        ? Math.ceil((u.accountLockedUntil!.getTime() - now.getTime()) / 60000)
        : 0;

      return {
        ...u,
        isLocked,
        minutesRemaining,
      };
    });

    return {
      blockedIps,
      lockedUsers,
    };
  }),

  unblockIp: developerProcedure
    .input(z.object({ ipAddress: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(ipBlocks).where(eq(ipBlocks.ipAddress, input.ipAddress));

      await logSystemEvent({
        eventType: "DEVELOPER_ACTION",
        action: "IP Address Unblocked",
        status: "INFO",
        userId: ctx.dbUser.id,
        userName: `${ctx.dbUser.firstName} ${ctx.dbUser.lastName}`,
        userEmail: ctx.dbUser.email,
        userRole: ctx.dbUser.role,
        details: `Removed login ban and reset failed attempts for IP ${input.ipAddress}`,
        metadata: { ipAddress: input.ipAddress },
      });

      return { success: true };
    }),

  unlockUser: developerProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      await ctx.db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          lockoutReason: null,
        })
        .where(eq(users.id, input.userId));

      await logSystemEvent({
        eventType: "DEVELOPER_ACTION",
        action: "User Account Unlocked",
        status: "INFO",
        userId: ctx.dbUser.id,
        userName: `${ctx.dbUser.firstName} ${ctx.dbUser.lastName}`,
        userEmail: ctx.dbUser.email,
        userRole: ctx.dbUser.role,
        details: `Unlocked user account for ${targetUser.firstName} ${targetUser.lastName} (${targetUser.employeeCode}), reset failed login counters.`,
        metadata: {
          targetUserId: targetUser.id,
          targetEmployeeCode: targetUser.employeeCode,
        },
      });

      return { success: true };
    }),
});
