import { z } from "zod";
import { createTRPCRouter, featureProtectedProcedure } from "@/server/api/trpc";
import { users } from "@/server/db/schema/users";
import { employeeTrackingStatus } from "@/server/db/schema/employeeTrackingStatus";
import { employeeLocations } from "@/server/db/schema/employeeLocations";
import { eq } from "drizzle-orm";
import { notifyAdmins } from "@/server/lib/monitoring";

export const heartbeatRouter = createTRPCRouter({
  pulse: featureProtectedProcedure("workforce")
    .meta({
      openapi: {
        method: "POST",
        path: "/heartbeat/pulse",
        summary: "Record user heartbeat",
        tags: ["Monitoring"],
      },
    })
    .input(
      z.object({
        lat: z.string().optional(),
        lng: z.string().optional(),
        status: z
          .enum(["Online", "Offline", "Low Battery", "No GPS"])
          .default("Online"),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, dbUser } = ctx;

      const latitude = input.lat ? parseFloat(input.lat) : undefined;
      const longitude = input.lng ? parseFloat(input.lng) : undefined;

      await db
        .update(users)
        .set({
          lastActiveAt: new Date(),
          lastLat: input.lat,
          lastLng: input.lng,
          connectivityStatus: input.status,
        })
        .where(eq(users.id, dbUser.id));

      await db
        .insert(employeeTrackingStatus)
        .values({
          employeeId: dbUser.id,
          lastLatitude: latitude,
          lastLongitude: longitude,
          lastUpdatedAt: new Date(),
          isOnline: input.status !== "Offline",
          locationPermissionStatus: input.status === "No GPS" ? "DISABLED" : "ALWAYS",
        })
        .onConflictDoUpdate({
          target: employeeTrackingStatus.employeeId,
          set: {
            lastLatitude: latitude,
            lastLongitude: longitude,
            lastUpdatedAt: new Date(),
            isOnline: input.status !== "Offline",
            locationPermissionStatus: input.status === "No GPS" ? "DISABLED" : "ALWAYS",
          },
        });

      if (latitude !== undefined && longitude !== undefined && !isNaN(latitude) && !isNaN(longitude)) {
        await db.insert(employeeLocations).values({
          employeeId: dbUser.id,
          latitude,
          longitude,
          accuracy: 10,
          recordedAt: new Date(),
        });
      }

      if (input.status === "No GPS") {
        await notifyAdmins(
          "GPS Violation Alert",
          `${dbUser.firstName} ${dbUser.lastName} (${dbUser.employeeCode}) has disabled their device's GPS!`,
        );
        // Automatically deactivate user for GPS violation lockout
        await db
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, dbUser.id));
      }

      return { success: true };
    }),
});
