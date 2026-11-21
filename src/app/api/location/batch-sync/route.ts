import { NextRequest, NextResponse } from "next/server";
import { getSession, getSessionFromHeaders } from "@/server/lib/auth";
import { db } from "@/server/db";
import {
  employeeLocations,
  employeeTrackingStatus,
  users,
  adminAlerts,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logSystemEvent, extractClientInfo } from "@/server/lib/audit-logger";

export const dynamic = "force-dynamic";

const batchSyncSchema = z.object({
  locations: z.array(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional().nullable(),
      heading: z.number().optional().nullable(),
      speed: z.number().optional().nullable(),
      isOfflineSynced: z.boolean().default(true),
      eventType: z.string().optional().default("location"),
      status: z.string().optional(),
      recordedAt: z.coerce.date(),
    }),
  ),
});

const MAX_OFFLINE_BUFFER_AGE_MS = 20 * 60 * 1000; // 20 minutes strict cutoff
const SKEW_ALLOWANCE_MS = 30 * 1000; // 30 seconds clock skew tolerance

export async function POST(request: NextRequest) {
  try {
    let session = await getSession();
    if (!session) {
      session = await getSessionFromHeaders(request.headers);
    }

    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as unknown;
    const parsed = batchSyncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { locations } = parsed.data;
    if (locations.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const now = Date.now();
    const employeeId = session.userId;
    const { ipAddress, userAgent } = extractClientInfo(request.headers);

    // 1. Strict 20-minute cutoff guard: Reject batch if any record is older than 20 mins
    const hasStaleRecords = locations.some((loc) => {
      const ageMs = now - loc.recordedAt.getTime();
      return ageMs > MAX_OFFLINE_BUFFER_AGE_MS + SKEW_ALLOWANCE_MS;
    });

    if (hasStaleRecords) {
      console.warn(
        `[BatchSync] Stale records rejected (>20m) for employee ${employeeId}`,
      );
      return NextResponse.json(
        {
          error:
            "Batch contains stale telemetry records older than 20 minutes cutoff. Session expired.",
          lockedOut: true,
        },
        { status: 401 },
      );
    }

    // 2. Check for GPS Disabled / Tamper Events
    const gpsDisabledEvent = locations.find(
      (loc) => loc.eventType === "gps_disabled",
    );

    const user = await db.query.users.findFirst({
      where: eq(users.id, employeeId),
    });

    if (gpsDisabledEvent && user) {
      const alertTitle = "Device GPS Manually Disabled";
      const alertMsg = `Alert: ${user.firstName} ${user.lastName} (${user.employeeCode}) manually turned off device GPS/Location hardware.`;

      await db.insert(adminAlerts).values({
        type: "EMPLOYEE_LOCATION_DISABLED",
        employeeId: user.id,
        title: alertTitle,
        message: alertMsg,
        metadata: JSON.stringify({
          eventType: "gps_disabled",
          recordedAt: gpsDisabledEvent.recordedAt.toISOString(),
        }),
      });

      await logSystemEvent({
        eventType: "LOCATION_ALERT",
        action: "Device GPS Disabled by User",
        status: "WARNING",
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userRole: user.role,
        employeeCode: user.employeeCode,
        details: "Native PROVIDERS_CHANGED or heartbeat detected location hardware was disabled",
        ipAddress,
        userAgent,
        metadata: {
          recordedAt: gpsDisabledEvent.recordedAt.toISOString(),
        },
      });

      await db
        .insert(employeeTrackingStatus)
        .values({
          employeeId: user.id,
          lastUpdatedAt: new Date(),
          locationPermissionStatus: "DISABLED",
          isOnline: false,
          isLockedOut: true,
          lockoutReason: "Device GPS hardware turned off by user.",
        })
        .onConflictDoUpdate({
          target: employeeTrackingStatus.employeeId,
          set: {
            lastUpdatedAt: new Date(),
            locationPermissionStatus: "DISABLED",
            isOnline: false,
            isLockedOut: true,
            lockoutReason: "Device GPS hardware turned off by user.",
          },
        });

      await db
        .update(users)
        .set({
          connectivityStatus: "Offline",
          lastActiveAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        success: true,
        gpsDisabledLogged: true,
        lockedOut: true,
      });
    }

    // 3. Normal chronological location storage
    const sorted = [...locations].sort(
      (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
    );

    const rows = sorted.map((loc) => ({
      employeeId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy ?? null,
      heading: loc.heading ?? null,
      speed: loc.speed ?? null,
      isOfflineSynced: loc.isOfflineSynced ?? true,
      recordedAt: loc.recordedAt,
    }));

    await db.insert(employeeLocations).values(rows);

    const latest = sorted[sorted.length - 1]!;
    await db
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
          isLockedOut: false,
          lockoutReason: null,
        },
      });

    // Update user active telemetry
    await db
      .update(users)
      .set({
        lastActiveAt: new Date(),
        lastLat: latest.latitude.toString(),
        lastLng: latest.longitude.toString(),
        connectivityStatus: "Online",
      })
      .where(eq(users.id, employeeId));

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error("Batch Sync Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
