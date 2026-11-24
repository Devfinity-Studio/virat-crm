import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { ipBlocks } from "@/server/db/schema/ipBlocks";
import { branches } from "@/server/db/schema/branches";
import { employeeTrackingStatus } from "@/server/db/schema/employeeTrackingStatus";
import { eq, or } from "drizzle-orm";
import { login, encrypt } from "@/server/lib/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { logSystemEvent, extractClientInfo } from "@/server/lib/audit-logger";

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour lockout

/**
 * Record a failed attempt for an IP address. If attempts >= 3, block the IP.
 */
async function recordFailedIpAttempt(ipAddress: string | null) {
  if (!ipAddress || ipAddress === "unknown") return null;

  const now = new Date();
  const existing = await db.query.ipBlocks.findFirst({
    where: eq(ipBlocks.ipAddress, ipAddress),
  });

  if (!existing) {
    await db.insert(ipBlocks).values({
      ipAddress,
      failedAttempts: 1,
      lastAttemptAt: now,
      createdAt: now,
    });
    return { attempts: 1, isBlocked: false };
  }

  const nextAttempts = existing.failedAttempts + 1;
  const isBlocked = nextAttempts >= MAX_FAILED_ATTEMPTS;
  const blockedUntil = isBlocked
    ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
    : existing.blockedUntil;

  await db
    .update(ipBlocks)
    .set({
      failedAttempts: nextAttempts,
      blockedUntil,
      lastAttemptAt: now,
    })
    .where(eq(ipBlocks.ipAddress, ipAddress));

  return { attempts: nextAttempts, isBlocked, blockedUntil };
}

/**
 * Clear failed attempts for an IP on successful login.
 */
async function clearIpAttempts(ipAddress: string | null) {
  if (!ipAddress || ipAddress === "unknown") return;
  await db.delete(ipBlocks).where(eq(ipBlocks.ipAddress, ipAddress));
}

export async function POST(request: Request) {
  const { ipAddress, userAgent } = extractClientInfo(request.headers);

  const body = (await request.json().catch(() => ({}))) as {
    employeeCode?: string;
    password?: string;
    branchId?: number;
  };
  const { employeeCode, password, branchId } = body;

  const now = new Date();

  // 1. Check IP Block Status
  if (ipAddress && ipAddress !== "unknown") {
    const ipRecord = await db.query.ipBlocks.findFirst({
      where: eq(ipBlocks.ipAddress, ipAddress),
    });

    if (ipRecord?.blockedUntil && ipRecord.blockedUntil.getTime() > now.getTime()) {
      const minutesRemaining = Math.ceil(
        (ipRecord.blockedUntil.getTime() - now.getTime()) / 60000,
      );

      await logSystemEvent({
        eventType: "LOGIN_FAILURE",
        action: "Login Rejected: IP Blocked",
        status: "WARNING",
        details: `Access denied. IP address is blocked due to 3+ failed attempts. Retry in ${minutesRemaining} minute(s).`,
        employeeCode: employeeCode ? employeeCode.trim() : null,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          error: `Too many failed attempts from your IP address. Access blocked for ${minutesRemaining} minute(s). Contact your system administrator for assistance.`,
          isIpBlocked: true,
          minutesRemaining,
        },
        { status: 429 },
      );
    }
  }

  // 2. Validate input presence
  if (!employeeCode || !password) {
    await recordFailedIpAttempt(ipAddress);
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

  // 3. Check Unknown User
  if (!user) {
    const ipResult = await recordFailedIpAttempt(ipAddress);
    await logSystemEvent({
      eventType: "LOGIN_FAILURE",
      action: "Login Attempt Failed",
      status: "FAILURE",
      details: `User with identifier '${cleanCode}' does not exist (IP failed attempts: ${ipResult?.attempts ?? 1})`,
      employeeCode: cleanCode,
      ipAddress,
      userAgent,
    });

    if (ipResult?.isBlocked) {
      return NextResponse.json(
        {
          error: "Too many failed attempts from this IP address. Access has been blocked for 1 hour. Contact administrator.",
          isIpBlocked: true,
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 4. Check Account Deactivated
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

  // 5. Check Account Lockout (3 wrong passwords)
  if (user.accountLockedUntil && user.accountLockedUntil.getTime() > now.getTime()) {
    const minutesRemaining = Math.ceil(
      (user.accountLockedUntil.getTime() - now.getTime()) / 60000,
    );

    await logSystemEvent({
      eventType: "LOGIN_FAILURE",
      action: "Login Blocked: Account Locked Out",
      status: "WARNING",
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userRole: user.role,
      employeeCode: user.employeeCode,
      details: `Account temporarily locked out due to 3 consecutive wrong passwords. Remaining: ${minutesRemaining} min.`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        error: `Account is locked due to multiple incorrect password attempts. Please try again in ${minutesRemaining} minute(s) or contact an administrator to unlock your account immediately.`,
        isAccountLocked: true,
        minutesRemaining,
      },
      { status: 423 },
    );
  }

  // 6. Check Password Set
  if (!user.password) {
    await recordFailedIpAttempt(ipAddress);
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

  // 7. Verify Password
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    const nextFailedCount = (user.failedLoginAttempts ?? 0) + 1;
    const isNowLocked = nextFailedCount >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = isNowLocked
      ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
      : null;

    // Update user failed attempt count & lock state
    await db
      .update(users)
      .set({
        failedLoginAttempts: nextFailedCount,
        accountLockedUntil: lockedUntil,
        lockoutReason: isNowLocked
          ? "Account blocked: 3 consecutive incorrect password attempts"
          : null,
      })
      .where(eq(users.id, user.id));

    // Also record failed attempt against IP
    const ipResult = await recordFailedIpAttempt(ipAddress);

    await logSystemEvent({
      eventType: "LOGIN_FAILURE",
      action: isNowLocked
        ? "Account Locked: 3 Wrong Passwords"
        : "Login Failed: Wrong Password",
      status: isNowLocked ? "WARNING" : "FAILURE",
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userRole: user.role,
      employeeCode: user.employeeCode,
      details: isNowLocked
        ? `Account blocked for 1 hour after ${nextFailedCount} wrong password attempts.`
        : `Password comparison failed. Attempt ${nextFailedCount} of ${MAX_FAILED_ATTEMPTS}.`,
      ipAddress,
      userAgent,
      metadata: {
        failedAttempts: nextFailedCount,
        isAccountLocked: isNowLocked,
        ipAttempts: ipResult?.attempts,
      },
    });

    if (isNowLocked) {
      return NextResponse.json(
        {
          error: "Account blocked: You have entered an incorrect password 3 times. For security, your account is locked for 1 hour. Contact administrator to unlock.",
          isAccountLocked: true,
          minutesRemaining: 60,
        },
        { status: 423 },
      );
    }

    if (ipResult?.isBlocked) {
      return NextResponse.json(
        {
          error: "Too many failed attempts from this IP address. Access has been blocked for 1 hour. Contact administrator.",
          isIpBlocked: true,
        },
        { status: 429 },
      );
    }

    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - nextFailedCount);
    return NextResponse.json(
      {
        error: `Invalid credentials. ${remainingAttempts} attempt(s) remaining before your account is blocked.`,
        remainingAttempts,
      },
      { status: 401 },
    );
  }

  // 8. Authentication Succeeded -> Clear failed attempts on both User and IP
  if ((user.failedLoginAttempts ?? 0) > 0 || user.accountLockedUntil) {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lockoutReason: null,
      })
      .where(eq(users.id, user.id));
  }

  await clearIpAttempts(ipAddress);

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
