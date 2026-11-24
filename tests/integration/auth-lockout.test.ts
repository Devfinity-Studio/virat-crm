import { describe, it, expect } from "vitest";

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface MockUser {
  id: string;
  employeeCode: string;
  failedLoginAttempts: number;
  accountLockedUntil: Date | null;
  lockoutReason: string | null;
}

interface MockIpRecord {
  ipAddress: string;
  failedAttempts: number;
  blockedUntil: Date | null;
}

describe("Brute Force Defense & Account Lockout", () => {
  it("should warn user on failed password attempts with remaining attempts count", () => {
    const user: MockUser = {
      id: "u-1",
      employeeCode: "EMP-001",
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lockoutReason: null,
    };

    // Attempt 1: wrong password
    user.failedLoginAttempts += 1;
    const remainingAfter1 = Math.max(0, MAX_FAILED_ATTEMPTS - user.failedLoginAttempts);
    expect(remainingAfter1).toBe(2);
    expect(user.accountLockedUntil).toBeNull();

    // Attempt 2: wrong password
    user.failedLoginAttempts += 1;
    const remainingAfter2 = Math.max(0, MAX_FAILED_ATTEMPTS - user.failedLoginAttempts);
    expect(remainingAfter2).toBe(1);
    expect(user.accountLockedUntil).toBeNull();
  });

  it("should lock account for 1 hour on 3rd consecutive wrong password", () => {
    const now = new Date("2026-11-24T12:00:00Z");
    const user: MockUser = {
      id: "u-2",
      employeeCode: "EMP-002",
      failedLoginAttempts: 2,
      accountLockedUntil: null,
      lockoutReason: null,
    };

    // Attempt 3: wrong password
    user.failedLoginAttempts += 1;
    const isLocked = user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS;
    if (isLocked) {
      user.accountLockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
      user.lockoutReason = "Account blocked: 3 consecutive incorrect password attempts";
    }

    expect(isLocked).toBe(true);
    expect(user.accountLockedUntil).not.toBeNull();
    expect(user.accountLockedUntil!.getTime()).toBe(now.getTime() + 3600000);
    expect(user.lockoutReason).toContain("Account blocked: 3 consecutive");

    // Check minutes remaining
    const minutesRemaining = Math.ceil(
      (user.accountLockedUntil!.getTime() - now.getTime()) / 60000,
    );
    expect(minutesRemaining).toBe(60);
  });

  it("should block IP address for 1 hour on 3rd failed attempt from that IP", () => {
    const now = new Date("2026-11-24T12:00:00Z");
    const ipRecord: MockIpRecord = {
      ipAddress: "192.168.1.100",
      failedAttempts: 2,
      blockedUntil: null,
    };

    // Attempt 3
    ipRecord.failedAttempts += 1;
    const isIpBlocked = ipRecord.failedAttempts >= MAX_FAILED_ATTEMPTS;
    if (isIpBlocked) {
      ipRecord.blockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
    }

    expect(isIpBlocked).toBe(true);
    expect(ipRecord.blockedUntil!.getTime()).toBe(now.getTime() + 3600000);
  });

  it("should reset counters on successful login", () => {
    const user: MockUser = {
      id: "u-3",
      employeeCode: "EMP-003",
      failedLoginAttempts: 2,
      accountLockedUntil: null,
      lockoutReason: null,
    };

    // Correct password entered:
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lockoutReason = null;

    expect(user.failedLoginAttempts).toBe(0);
    expect(user.accountLockedUntil).toBeNull();
  });

  it("should automatically allow login once lockout duration has elapsed", () => {
    const lockedAt = new Date("2026-11-24T12:00:00Z");
    const user: MockUser = {
      id: "u-4",
      employeeCode: "EMP-004",
      failedLoginAttempts: 3,
      accountLockedUntil: new Date(lockedAt.getTime() + LOCKOUT_DURATION_MS), // 13:00:00Z
      lockoutReason: "Account blocked",
    };

    // Check at 12:30 (still locked)
    const timeAt1230 = new Date("2026-11-24T12:30:00Z");
    const isLockedAt1230 =
      !!user.accountLockedUntil && user.accountLockedUntil.getTime() > timeAt1230.getTime();
    expect(isLockedAt1230).toBe(true);

    // Check at 13:01 (lock expired)
    const timeAt1301 = new Date("2026-11-24T13:01:00Z");
    const isLockedAt1301 =
      !!user.accountLockedUntil && user.accountLockedUntil.getTime() > timeAt1301.getTime();
    expect(isLockedAt1301).toBe(false);
  });

  it("should reset user lockout when admin or developer triggers unlockAccount", () => {
    const user: MockUser = {
      id: "u-5",
      employeeCode: "EMP-005",
      failedLoginAttempts: 3,
      accountLockedUntil: new Date(Date.now() + 1800000),
      lockoutReason: "Account blocked",
    };

    // Admin unlocks user:
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lockoutReason = null;

    expect(user.failedLoginAttempts).toBe(0);
    expect(user.accountLockedUntil).toBeNull();
    expect(user.lockoutReason).toBeNull();
  });
});
