import { getSession, logout } from "@/server/lib/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { logSystemEvent, extractClientInfo } from "@/server/lib/audit-logger";

export async function POST(request: Request) {
  let reason = "Manual user logout";
  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    if (body?.reason) reason = body.reason;
  } catch {
    // Body is optional
  }

  const { ipAddress, userAgent } = extractClientInfo(request.headers);

  try {
    const session = await getSession();
    if (session?.userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
      });

      if (user) {
        await logSystemEvent({
          eventType: "LOGOUT",
          action: "User Logged Out",
          status: "INFO",
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          userRole: user.role,
          employeeCode: user.employeeCode,
          details: reason,
          ipAddress,
          userAgent,
        });
      }
    }
  } catch (err) {
    console.error("Error logging logout event:", err);
  }

  await logout();
  return NextResponse.json({ success: true });
}
