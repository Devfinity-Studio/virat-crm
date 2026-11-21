import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { branches } from "@/server/db/schema/branches";
import { employeeTrackingStatus } from "@/server/db/schema/employeeTrackingStatus";
import { eq, or } from "drizzle-orm";
import { login, encrypt } from "@/server/lib/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { logSystemEvent, extractClientInfo } from "@/server/lib/audit-logger";

export async function POST(request: Request) {
  const { ipAddress, userAgent } = extractClientInfo(request.headers);

  const body = (await request.json().catch(() => ({}))) as {
    employeeCode?: string;
    password?: string;
    branchId?: number;
  };
  const { employeeCode, password, branchId } = body;

  if (!employeeCode || !password) {
    await logSystemEvent({
      eventType: "LOGIN_FAILURE",
      action: "Login Attempt Failed",
      status: "FAILURE",
      details: "Missing credentials provided in login request",
      employeeCode: employeeCode ? employeeCode.trim() : null,
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const cleanCode = employeeCode.trim();
  const user = await db.query.users.findFirst({
    where: or(
      eq(users.employeeCode, cleanCode),
      eq(users.employeeCode, cleanCode.toUpperCase()),
      eq(users.employeeCode, cleanCode.toLowerCase()),
      eq(users.email, cleanCode.toLowerCase()),
      eq(users.firstName, cleanCode),
    ),
  });

  if (!user) {
    await logSystemEvent({
      eventType: "LOGIN_FAILURE",
      action: "Login Attempt Failed",
      status: "FAILURE",
      details: `User with identifier '${cleanCode}' does not exist`,
      employeeCode: cleanCode,
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!user.isActive) {
    await logSystemEvent({
      eventType: "LOGIN_FAILURE",
      action: "Login Blocked: Deactivated User",
      status: "FAILURE",
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userRole: user.role,
      employeeCode: user.employeeCode,
      details: "User account is marked inactive / suspended",
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Check password
  if (!user.password) {
    await logSystemEvent({
      eventType: "LOGIN_FAILURE",
      action: "Login Attempt Failed",
      status: "FAILURE",
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userRole: user.role,
      employeeCode: user.employeeCode,
      details: "Password not set in system. Contact Administrator.",
      ipAddress,
      userAgent,
    });
    return NextResponse.json(
      { error: "Password not set. Please contact admin." },
      { status: 401 },
    );
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    await logSystemEvent({
      eventType: "LOGIN_FAILURE",
      action: "Login Failed: Wrong Password",
      status: "FAILURE",
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userRole: user.role,
      employeeCode: user.employeeCode,
      details: "Password comparison failed (incorrect password entered)",
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // If user is Admin, they MUST select a branch to operate under
  if (user.role === "Admin") {
    if (branchId === undefined) {
      const activeBranches = await db.query.branches.findMany({
        where: eq(branches.isActive, true),
      });
      return NextResponse.json({
        requireBranch: true,
        branches: activeBranches.map((b) => ({ id: b.id, name: b.name })),
      });
    }

    // Update the Admin's branchId to the selected branch so that their operations are locked to this branch
    await db.update(users).set({ branchId }).where(eq(users.id, user.id));
  }

  // Unlock employee tracking in database upon successful authentication
  await db
    .insert(employeeTrackingStatus)
    .values({
      employeeId: user.id,
      isLockedOut: false,
      lockoutReason: null,
      isOnline: true,
      lastUpdatedAt: new Date(),
      locationPermissionStatus: "ALWAYS",
    })
    .onConflictDoUpdate({
      target: employeeTrackingStatus.employeeId,
      set: {
        isLockedOut: false,
        lockoutReason: null,
        isOnline: true,
        lastUpdatedAt: new Date(),
      },
    });

  // Create session
  await login(user.id);

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionToken = await encrypt({ userId: user.id, expires });

  // Log successful login
  await logSystemEvent({
    eventType: "LOGIN_SUCCESS",
    action: "User Authenticated Successfully",
    status: "SUCCESS",
    userId: user.id,
    userName: `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    userRole: user.role,
    employeeCode: user.employeeCode,
    details: `Signed in under role ${user.role}${branchId ? ` (Branch ID: ${branchId})` : ""}`,
    ipAddress,
    userAgent,
    metadata: {
      branchId: branchId ?? user.branchId,
    },
  });

  return NextResponse.json({
    success: true,
    token: sessionToken,
    user: {
      id: user.id,
      role: user.role,
      employeeCode: user.employeeCode,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
}
