import { NextRequest, NextResponse } from "next/server";
import { getSession, getSessionFromHeaders } from "@/server/lib/auth";
import { db } from "@/server/db";
import { users, employeeTrackingStatus, adminAlerts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { notifyAdmins } from "@/server/lib/monitoring";
import { logSystemEvent, extractClientInfo } from "@/server/lib/audit-logger";

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

    // 4. Log to developer audit log
    const { ipAddress, userAgent } = extractClientInfo(request.headers);
    await logSystemEvent({
      eventType: "LOCATION_ALERT",
      action: "Location Emergency Revoked",
      status: "WARNING",
      userId: employee.id,
      userName: `${employee.firstName} ${employee.lastName}`,
      userEmail: employee.email,
      userRole: employee.role,
      employeeCode: employee.employeeCode,
      details: reason,
      ipAddress,
      userAgent,
      metadata: { reason, payload },
    });

    // Note: Do NOT log out or destroy the session. A temporary location service
    // issue should never automatically log out the user.
    return NextResponse.json({ success: true, loggedOut: false });
  } catch (error) {
    console.error("Emergency Revoke Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

