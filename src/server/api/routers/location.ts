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
            isLockedOut: false,
            lockoutReason: null,
          },
        });

      // Keep user's canonical location & active state up-to-date
      await ctx.db
        .update(users)
        .set({
          lastActiveAt: new Date(),
          lastLat: latest.latitude.toString(),
          lastLng: latest.longitude.toString(),
          connectivityStatus: "Online",
        })
        .where(eq(users.id, employeeId));

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

      // Non-field staff (e.g. Admins, Developers) should not be locked out of the CRM if GPS is denied on desktop
      const shouldLockOut =
        isPermissionDisabled && ctx.dbUser.role === "Employee";

      await ctx.db
        .insert(employeeTrackingStatus)
        .values({
          employeeId,
          lastLatitude: input.latitude ?? null,
          lastLongitude: input.longitude ?? null,
          lastUpdatedAt: new Date(),
          locationPermissionStatus: input.locationPermissionStatus,
          isOnline: input.isOnline ?? true,
          isLockedOut: shouldLockOut,
          lockoutReason: shouldLockOut
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
            isLockedOut: shouldLockOut,
            lockoutReason: shouldLockOut
              ? "Location permission denied or disabled"
              : null,
          },
        });

      if (input.latitude !== undefined && input.longitude !== undefined) {
        await ctx.db
          .update(users)
          .set({
            lastActiveAt: new Date(),
            lastLat: input.latitude.toString(),
            lastLng: input.longitude.toString(),
            connectivityStatus: input.isOnline ? "Online" : "Offline",
          })
          .where(eq(users.id, employeeId));
      } else {
        await ctx.db
          .update(users)
          .set({
            lastActiveAt: new Date(),
            connectivityStatus: input.isOnline ? "Online" : "Offline",
          })
          .where(eq(users.id, employeeId));
      }

      if (shouldLockOut) {
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
    // Fetch all active employees/users
    const allEmployees = await ctx.db.query.users.findMany({
      where: eq(users.isActive, true),
      with: {
        branch: true,
      },
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        email: true,
        profilePhoto: true,
        role: true,
        branchId: true,
        lastLat: true,
        lastLng: true,
        lastActiveAt: true,
        connectivityStatus: true,
      },
    });

    const trackingStatuses =
      await ctx.db.query.employeeTrackingStatus.findMany();
    const statusMap = new Map(
      trackingStatuses.map((s) => [s.employeeId, s]),
    );

    // Also fetch latest location points from employeeLocations as fallback
    const latestLocations = await ctx.db
      .select({
        employeeId: employeeLocations.employeeId,
        latitude: employeeLocations.latitude,
        longitude: employeeLocations.longitude,
        accuracy: employeeLocations.accuracy,
        speed: employeeLocations.speed,
        heading: employeeLocations.heading,
        recordedAt: employeeLocations.recordedAt,
      })
      .from(employeeLocations)
      .orderBy(desc(employeeLocations.recordedAt));

    const latestLocationMap = new Map<string, (typeof latestLocations)[0]>();
    for (const loc of latestLocations) {
      if (!latestLocationMap.has(loc.employeeId)) {
        latestLocationMap.set(loc.employeeId, loc);
      }
    }

    const now = Date.now();

    return allEmployees.map((emp) => {
      const status = statusMap.get(emp.id);
      const latestLoc = latestLocationMap.get(emp.id);

      // Determine best available latitude and longitude
      const lastLatitude =
        status?.lastLatitude ??
        latestLoc?.latitude ??
        (emp.lastLat ? parseFloat(emp.lastLat) : null) ??
        (emp.branch?.latitude ? parseFloat(emp.branch.latitude) : null);

      const lastLongitude =
        status?.lastLongitude ??
        latestLoc?.longitude ??
        (emp.lastLng ? parseFloat(emp.lastLng) : null) ??
        (emp.branch?.longitude ? parseFloat(emp.branch.longitude) : null);

      const lastUpdatedAt =
        status?.lastUpdatedAt ??
        latestLoc?.recordedAt ??
        emp.lastActiveAt ??
        null;

      const lastAccuracy = status?.lastAccuracy ?? latestLoc?.accuracy ?? null;
      const lastHeading = status?.lastHeading ?? latestLoc?.heading ?? null;
      const lastSpeed = status?.lastSpeed ?? latestLoc?.speed ?? null;

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
      } else {
        const lastUpdatedMs = lastUpdatedAt
          ? new Date(lastUpdatedAt).getTime()
          : 0;
        const isRecentlyActive =
          now - lastUpdatedMs <= 22 * 60 * 1000;

        if (status?.isOnline || isRecentlyActive) {
          if (isRecentlyActive && lastLatitude !== null && lastLongitude !== null) {
            statusBadge = "ONLINE_TRACKING";
          } else if (lastLatitude !== null && lastLongitude !== null) {
            statusBadge = "OFFLINE_BUFFERING";
          } else {
            statusBadge = "OFFLINE_BUFFERING";
          }
        } else if (lastLatitude !== null && lastLongitude !== null) {
          statusBadge = "OFFLINE_BUFFERING";
        } else {
          statusBadge = "LOCATION_DISABLED";
        }
      }

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeCode: emp.employeeCode,
        email: emp.email,
        profilePhoto: emp.profilePhoto,
        role: emp.role,
        branchId: emp.branchId,
        tracking: {
          lastLatitude,
          lastLongitude,
          lastAccuracy,
          lastHeading,
          lastSpeed,
          lastUpdatedAt,
          locationPermissionStatus:
            status?.locationPermissionStatus ?? "ALWAYS",
          isOnline:
            status?.isOnline ??
            (now - (lastUpdatedAt ? new Date(lastUpdatedAt).getTime() : 0) <=
              22 * 60 * 1000),
          isLockedOut: status?.isLockedOut ?? false,
          lockoutReason: status?.lockoutReason ?? null,
          statusBadge,
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
