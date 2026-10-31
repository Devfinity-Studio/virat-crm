import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import {
  users,
  employeeLocations,
  employeeTrackingStatus,
  adminAlerts,
} from "@/server/db/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { notifyAdmins } from "@/server/lib/monitoring";

export const locationRouter = createTRPCRouter({
  /**
   * High-frequency / 15-minute persistence batch ingestion for Employees.
   * RBAC: Employee can ONLY record for their own authenticated session.
   */
  recordLocationBatch: protectedProcedure
    .input(
      z.object({
        locations: z.array(
          z.object({
            latitude: z.number(),
            longitude: z.number(),
            accuracy: z.number().optional().nullable(),
            heading: z.number().optional().nullable(),
            speed: z.number().optional().nullable(),
            isOfflineSynced: z.boolean().default(false),
            recordedAt: z.coerce.date(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const employeeId = ctx.dbUser.id;
      if (!input.locations || input.locations.length === 0) {
        return { success: true, count: 0 };
      }

      // Sort chronologically
      const sorted = [...input.locations].sort(
        (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
      );

      // Insert all locations into employee_locations
      const rowsToInsert = sorted.map((loc) => ({
        employeeId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy ?? null,
        heading: loc.heading ?? null,
        speed: loc.speed ?? null,
        isOfflineSynced: loc.isOfflineSynced,
        recordedAt: loc.recordedAt,
      }));

      await ctx.db.insert(employeeLocations).values(rowsToInsert);

      // Update latest state in employee_tracking_status
      const latest = sorted[sorted.length - 1]!;
      await ctx.db
        .insert(employeeTrackingStatus)
        .values({
          employeeId,
          lastLatitude: latest.latitude,
          lastLongitude: latest.longitude,
          lastAccuracy: latest.accuracy ?? null,
          lastHeading: latest.heading ?? null,
          lastSpeed: latest.speed ?? null,
          lastUpdatedAt: new Date(),
          isOnline: true,
          locationPermissionStatus: "ALWAYS",
          isLockedOut: false,
          lockoutReason: null,
        })
        .onConflictDoUpdate({
          target: employeeTrackingStatus.employeeId,
          set: {
            lastLatitude: latest.latitude,
            lastLongitude: latest.longitude,
            lastAccuracy: latest.accuracy ?? null,
            lastHeading: latest.heading ?? null,
            lastSpeed: latest.speed ?? null,
            lastUpdatedAt: new Date(),
            isOnline: true,
            locationPermissionStatus: "ALWAYS",
          },
        });

      return { success: true, count: rowsToInsert.length };
    }),

  /**
   * Update tracking status and permission status (Employee self-update).
   */
  updateTrackingStatus: protectedProcedure
    .input(
      z.object({
        locationPermissionStatus: z.enum([
          "ALWAYS",
          "WHILE_IN_USE",
          "DENIED",
          "DISABLED",
        ]),
        isOnline: z.boolean().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const employeeId = ctx.dbUser.id;

      const isPermissionDisabled =
        input.locationPermissionStatus === "DENIED" ||
        input.locationPermissionStatus === "DISABLED";

      await ctx.db
        .insert(employeeTrackingStatus)
        .values({
          employeeId,
          lastLatitude: input.latitude ?? null,
          lastLongitude: input.longitude ?? null,
          lastUpdatedAt: new Date(),
          locationPermissionStatus: input.locationPermissionStatus,
          isOnline: input.isOnline ?? true,
          isLockedOut: isPermissionDisabled,
          lockoutReason: isPermissionDisabled
            ? "Location permission denied or disabled"
            : null,
        })
        .onConflictDoUpdate({
          target: employeeTrackingStatus.employeeId,
          set: {
            lastLatitude: input.latitude ?? undefined,
            lastLongitude: input.longitude ?? undefined,
            lastUpdatedAt: new Date(),
            locationPermissionStatus: input.locationPermissionStatus,
            isOnline: input.isOnline ?? undefined,
            isLockedOut: isPermissionDisabled ? true : undefined,
            lockoutReason: isPermissionDisabled
              ? "Location permission denied or disabled"
              : undefined,
          },
        });

      if (isPermissionDisabled) {
        const title = "Location Services Disabled";
        const message = `Alert: ${ctx.dbUser.firstName} ${ctx.dbUser.lastName} (${ctx.dbUser.employeeCode}) disabled location services and was logged out.`;

        await ctx.db.insert(adminAlerts).values({
          type: "EMPLOYEE_LOCATION_DISABLED",
          employeeId,
          title,
          message,
        });

        await notifyAdmins(title, message);
      }

      return { success: true };
    }),

  /**
   * Emergency Revoke procedure: called when GPS/Permission is turned off.
   */
  emergencyRevoke: protectedProcedure
    .input(
      z
        .object({
          reason: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const employeeId = ctx.dbUser.id;
      const reason =
        input?.reason ?? "Location services disabled or permission revoked";

      await ctx.db
        .insert(employeeTrackingStatus)
        .values({
          employeeId,
          lastUpdatedAt: new Date(),
          locationPermissionStatus: "DISABLED",
          isOnline: false,
          isLockedOut: true,
          lockoutReason: reason,
        })
        .onConflictDoUpdate({
          target: employeeTrackingStatus.employeeId,
          set: {
            lastUpdatedAt: new Date(),
            locationPermissionStatus: "DISABLED",
            isOnline: false,
            isLockedOut: true,
            lockoutReason: reason,
          },
        });

      const title = "Employee Location Disabled";
      const message = `Alert: ${ctx.dbUser.firstName} ${ctx.dbUser.lastName} (${ctx.dbUser.employeeCode}) disabled location services and was automatically logged out.`;

      await ctx.db.insert(adminAlerts).values({
        type: "EMPLOYEE_LOCATION_DISABLED",
        employeeId,
        title,
        message,
        metadata: JSON.stringify({ reason }),
      });

      await notifyAdmins(title, message);

      return { success: true };
    }),

  /**
   * Report offline grace period expiration (> 22 minutes).
   */
  reportLockout: protectedProcedure
    .input(
      z.object({
        offlineDurationMinutes: z.number(),
        reason: z.string().default("Offline grace period (22 mins) expired"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const employeeId = ctx.dbUser.id;

      await ctx.db
        .insert(employeeTrackingStatus)
        .values({
          employeeId,
          lastUpdatedAt: new Date(),
          isOnline: false,
          isLockedOut: true,
          lockoutReason: input.reason,
        })
        .onConflictDoUpdate({
          target: employeeTrackingStatus.employeeId,
          set: {
            lastUpdatedAt: new Date(),
            isOnline: false,
            isLockedOut: true,
            lockoutReason: input.reason,
          },
        });

      const title = "Employee Offline Lockout";
      const message = `Alert: ${ctx.dbUser.firstName} ${ctx.dbUser.lastName} (${ctx.dbUser.employeeCode}) was offline for ${input.offlineDurationMinutes.toFixed(1)} minutes and has been locked out.`;

      await ctx.db.insert(adminAlerts).values({
        type: "EMPLOYEE_OFFLINE_TIMEOUT",
        employeeId,
        title,
        message,
        metadata: JSON.stringify(input),
      });

      await notifyAdmins(title, message);

      return { success: true };
    }),

  /**
   * Admin Endpoint: Get all active employees with their live tracking status.
   * RBAC: Strictly ADMIN or DEVELOPER role. Non-admins receive 403 Forbidden.
   */
  getLiveTeam: adminProcedure.query(async ({ ctx }) => {
    // Fetch all active employees
    const allEmployees = await ctx.db.query.users.findMany({
      where: eq(users.isActive, true),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        email: true,
        profilePhoto: true,
        role: true,
        branchId: true,
      },
    });

    const trackingStatuses =
      await ctx.db.query.employeeTrackingStatus.findMany();
    const statusMap = new Map(
      trackingStatuses.map((s) => [s.employeeId, s]),
    );

    const now = Date.now();

    return allEmployees.map((emp) => {
      const status = statusMap.get(emp.id);

      let statusBadge:
        | "ONLINE_TRACKING"
        | "OFFLINE_BUFFERING"
        | "LOCATION_DISABLED"
        | "LOCKED_OUT" = "OFFLINE_BUFFERING";

      if (status?.isLockedOut) {
        statusBadge = "LOCKED_OUT";
      } else if (
        status?.locationPermissionStatus === "DISABLED" ||
        status?.locationPermissionStatus === "DENIED"
      ) {
        statusBadge = "LOCATION_DISABLED";
      } else if (status?.isOnline) {
        const lastUpdatedMs = status.lastUpdatedAt
          ? new Date(status.lastUpdatedAt).getTime()
          : 0;
        // If last update was within 22 minutes, consider online
        if (now - lastUpdatedMs <= 22 * 60 * 1000) {
          statusBadge = "ONLINE_TRACKING";
        } else {
          statusBadge = "OFFLINE_BUFFERING";
        }
      }

      return {
        ...emp,
        tracking: status
          ? {
              lastLatitude: status.lastLatitude,
              lastLongitude: status.lastLongitude,
              lastAccuracy: status.lastAccuracy,
              lastHeading: status.lastHeading,
              lastSpeed: status.lastSpeed,
              lastUpdatedAt: status.lastUpdatedAt,
              locationPermissionStatus: status.locationPermissionStatus,
              isOnline: status.isOnline,
              isLockedOut: status.isLockedOut,
              lockoutReason: status.lockoutReason,
              statusBadge,
            }
          : {
              lastLatitude: null,
              lastLongitude: null,
              lastAccuracy: null,
              lastHeading: null,
              lastSpeed: null,
              lastUpdatedAt: null,
              locationPermissionStatus: "DISABLED",
              isOnline: false,
              isLockedOut: false,
              lockoutReason: null,
              statusBadge: "LOCATION_DISABLED" as const,
            },
      };
    });
  }),

  /**
   * Admin Endpoint: Get today's route checkpoints for an employee.
   * RBAC: Strictly ADMIN or DEVELOPER role. Non-admins receive 403 Forbidden.
   */
  getEmployeeTodayRoute: adminProcedure
    .input(
      z.object({
        employeeId: z.string().uuid(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Calculate start and end of day in local time (Asia/Kolkata)
      const targetDate = input.date
        ? new Date(`${input.date}T00:00:00+05:30`)
        : new Date();

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const checkpoints = await ctx.db.query.employeeLocations.findMany({
        where: and(
          eq(employeeLocations.employeeId, input.employeeId),
          gte(employeeLocations.recordedAt, startOfDay),
          lte(employeeLocations.recordedAt, endOfDay),
        ),
        orderBy: [asc(employeeLocations.recordedAt)],
        columns: {
          id: true,
          latitude: true,
          longitude: true,
          accuracy: true,
          heading: true,
          speed: true,
          isOfflineSynced: true,
          recordedAt: true,
        },
      });

      const employee = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.employeeId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          email: true,
          profilePhoto: true,
        },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      return {
        employee,
        checkpoints,
        totalCheckpoints: checkpoints.length,
      };
    }),

  /**
   * Admin Endpoint: Get real-time alerts feed.
   */
  getAdminAlerts: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          unreadOnly: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const unreadOnly = input?.unreadOnly ?? false;

      const filters = unreadOnly ? eq(adminAlerts.isRead, false) : undefined;

      const alerts = await ctx.db.query.adminAlerts.findMany({
        where: filters,
        orderBy: [desc(adminAlerts.createdAt)],
        limit,
        with: {
          employee: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
        },
      });

      return alerts;
    }),

  /**
   * Admin Endpoint: Mark alert as read.
   */
  markAlertRead: adminProcedure
    .input(z.object({ alertId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(adminAlerts)
        .set({ isRead: true })
        .where(eq(adminAlerts.id, input.alertId));
      return { success: true };
    }),
});
