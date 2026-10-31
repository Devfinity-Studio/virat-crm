import { NextRequest, NextResponse } from "next/server";
import { getSession, getSessionFromHeaders, logout } from "@/server/lib/auth";
import { db } from "@/server/db";
import { users, employeeTrackingStatus, adminAlerts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { notifyAdmins } from "@/server/lib/monitoring";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let session = await getSession();
    if (!session) {
      session = await getSessionFromHeaders(request.headers);
    }

    let payload: { reason?: string; employeeId?: string } = {};
    try {
      const text = await request.text();
      if (text) {
        payload = JSON.parse(text) as { reason?: string; employeeId?: string };
      }
    } catch {
      // payload might be empty or blob
    }

    const employeeId = session?.userId ?? payload.employeeId;
    if (!employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await db.query.users.findFirst({
      where: eq(users.id, employeeId),
    });

    if (!employee) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const reason = payload.reason ?? "Location services disabled or permission revoked";

    // 1. Update employee tracking status to DISABLED and locked out
    await db
      .insert(employeeTrackingStatus)
      .values({
        employeeId: employee.id,
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

    // 2. Persist admin alert
    const title = "Location Services Disabled";
    const message = `Alert: ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) disabled location services and was automatically logged out.`;

    await db.insert(adminAlerts).values({
      type: "EMPLOYEE_LOCATION_DISABLED",
      employeeId: employee.id,
      title,
      message,
      metadata: JSON.stringify({ reason }),
    });

    // 3. Dispatch push notifications and in-app alerts to all admins
    await notifyAdmins(title, message);

    // 4. Invalidate server-side session cookie
    try {
      await logout();
    } catch {
      // Ignore if called outside cookie context
    }

    const response = NextResponse.json({ success: true, loggedOut: true });
    response.cookies.set("session", "", { expires: new Date(0) });
    return response;
  } catch (error) {
    console.error("Emergency Revoke Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

