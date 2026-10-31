import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { employeeLocations } from "@/server/db/schema/employeeLocations";
import { dailyMileage } from "@/server/db/schema/daily_mileage";
import { distance } from "@turf/turf";
import { point } from "@turf/helpers";

export const maxDuration = 300; // Vercel Cron Max duration (5 mins)
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Fetch employee locations ordered by employeeId and recordedAt
    const allLocations = await db.query.employeeLocations.findMany({
      orderBy: (loc, { asc }) => [
        asc(loc.employeeId),
        asc(loc.recordedAt),
      ],
    });

    if (allLocations.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    // 2. Group by Employee and Date
    type EmpLocation = (typeof allLocations)[0];
    const grouped: Record<string, EmpLocation[]> = {};

    for (const b of allLocations) {
      // Localize to Asia/Kolkata date
      const tzDate = new Date(
        b.recordedAt.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      );
      const year = tzDate.getFullYear();
      const month = String(tzDate.getMonth() + 1).padStart(2, "0");
      const day = String(tzDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const key = `${b.employeeId}_${dateStr}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(b);
    }

    // 3. Process each group
    const updates: {
      userId: string;
      date: string;
      totalDistanceMeters: string;
      validPointsCount: number;
    }[] = [];

    for (const [key, points] of Object.entries(grouped)) {
      const [userId, date] = key.split("_") as [string, string];
      let totalDistance = 0;
      let validPointsCount = 0;

      if (points.length > 0) {
        validPointsCount = 1;
        let lastValidPoint = points[0];

        for (let i = 1; i < points.length; i++) {
          const currentPoint = points[i];
          if (!lastValidPoint || !currentPoint) continue;

          const dist = distance(
            point([lastValidPoint.longitude, lastValidPoint.latitude]),
            point([currentPoint.longitude, currentPoint.latitude]),
            "meters",
          );

          if (dist >= 10 && dist < 100000) {
            totalDistance += dist;
            validPointsCount++;
            lastValidPoint = currentPoint;
          }
        }
      }

      updates.push({
        userId,
        date,
        totalDistanceMeters: totalDistance.toFixed(2),
        validPointsCount,
      });
    }

    // 4. Upsert into daily_mileage
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .insert(dailyMileage)
          .values({
            userId: update.userId,
            date: update.date,
            totalDistanceMeters: update.totalDistanceMeters,
            validPointsCount: update.validPointsCount,
          })
          .onConflictDoUpdate({
            target: [dailyMileage.userId, dailyMileage.date],
            set: {
              totalDistanceMeters: update.totalDistanceMeters,
              validPointsCount: update.validPointsCount,
              calculatedAt: new Date(),
            },
          });
      }
    });

    return NextResponse.json({
      success: true,
      processedLocations: allLocations.length,
      updatedGroups: updates.length,
    });
  } catch (error) {
    console.error("Mileage Cron Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
