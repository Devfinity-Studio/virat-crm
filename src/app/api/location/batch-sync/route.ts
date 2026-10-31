import { NextRequest, NextResponse } from "next/server";
import { getSession, getSessionFromHeaders } from "@/server/lib/auth";
import { db } from "@/server/db";
import { employeeLocations, employeeTrackingStatus } from "@/server/db/schema";
import { z } from "zod";

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
      recordedAt: z.coerce.date(),
    }),
  ),
});

export async function POST(request: NextRequest) {
  try {
    let session = await getSession();
    if (!session) {
      session = await getSessionFromHeaders(request.headers);
    }

    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
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

    const employeeId = session.userId;

    // Chronological order
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
      isOfflineSynced: true,
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
        },
      });

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error("Batch Sync Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

