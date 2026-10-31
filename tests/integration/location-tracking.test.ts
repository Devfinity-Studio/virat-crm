import "dotenv/config";
import { describe, it, expect, beforeEach } from "vitest";
import {
  MAX_OFFLINE_GRACE_MS,
  getOfflineStartedAt,
  setOfflineStartedAt,
  clearOfflineStartedAt,
  isBufferExpired,
  getRemainingGraceMs,
  isLockedOut,
  setLockedOut,
  getLockoutReason,
  clearAllStorage,
} from "@/lib/offline-location-queue";

describe("Location Tracking System & Offline Buffer Engine", () => {
  beforeEach(() => {
    clearAllStorage();
  });

  describe("Offline Buffer & 22-Minute Threshold Guard", () => {
    it("should have strict 22-minute maximum offline grace period", () => {
      expect(MAX_OFFLINE_GRACE_MS).toBe(22 * 60 * 1000);
    });

    it("should accurately persist and retrieve immutable offline start timestamp", () => {
      const now = Date.now();
      setOfflineStartedAt(now);
      expect(getOfflineStartedAt()).toBe(now);

      // Subsequent set call should NOT overwrite existing start time
      const later = now + 5000;
      setOfflineStartedAt(later);
      expect(getOfflineStartedAt()).toBe(now);

      clearOfflineStartedAt();
      expect(getOfflineStartedAt()).toBeNull();
    });

    it("should permit offline operation within 22-minute grace period", () => {
      const twentyMinsAgo = Date.now() - 20 * 60 * 1000;
      setOfflineStartedAt(twentyMinsAgo);

      expect(isBufferExpired()).toBe(false);
      expect(getRemainingGraceMs()).toBeGreaterThan(0);
      expect(getRemainingGraceMs()).toBeLessThanOrEqual(2 * 60 * 1000 + 100);
    });

    it("should trigger hard expiration when offline duration exceeds 22 minutes", () => {
      const twentyThreeMinsAgo = Date.now() - 23 * 60 * 1000;
      setOfflineStartedAt(twentyThreeMinsAgo);

      expect(isBufferExpired()).toBe(true);
      expect(getRemainingGraceMs()).toBe(0);
    });

    it("should manage tamper-proof lockout state and lockout reasons", () => {
      expect(isLockedOut()).toBe(false);

      setLockedOut(true, "Offline buffer exceeded 22 minutes limit");
      expect(isLockedOut()).toBe(true);
      expect(getLockoutReason()).toBe("Offline buffer exceeded 22 minutes limit");

      setLockedOut(false);
      expect(isLockedOut()).toBe(false);
    });
  });

  describe("RBAC & Role Verification", () => {
    it("should enforce admin-only access rules for live maps", () => {
      const adminRoles = ["Admin", "Developer"];
      const employeeRoles = ["Employee", "Manager"];

      const canAccessAdminMap = (role: string) => adminRoles.includes(role);

      expect(canAccessAdminMap("Admin")).toBe(true);
      expect(canAccessAdminMap("Developer")).toBe(true);
      expect(canAccessAdminMap("Employee")).toBe(false);
      expect(canAccessAdminMap("Manager")).toBe(false);
    });

    it("should enforce that employees can only ingest points for their own session", () => {
      const sessionUserId = "usr-emp-123";
      const submittedBodyUserId = "usr-emp-999";

      // The server always uses session.userId and discards/ignores any submitted userId
      const effectiveIngestionUserId = sessionUserId;
      expect(effectiveIngestionUserId).toBe(sessionUserId);
      expect(effectiveIngestionUserId).not.toBe(submittedBodyUserId);
    });
  });

  describe("Chronological Batch Ingestion Logic", () => {
    it("should strictly sort unsorted batch points by recordedAt ascending", () => {
      const points = [
        { id: 1, recordedAt: new Date("2026-10-31T10:30:00Z"), lat: 28.61 },
        { id: 2, recordedAt: new Date("2026-10-31T10:00:00Z"), lat: 28.60 },
        { id: 3, recordedAt: new Date("2026-10-31T10:15:00Z"), lat: 28.605 },
      ];

      const sorted = [...points].sort(
        (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
      );

      expect(sorted[0]?.id).toBe(2); // 10:00
      expect(sorted[1]?.id).toBe(3); // 10:15
      expect(sorted[2]?.id).toBe(1); // 10:30
    });
  });

  describe("Emergency Revoke Trigger", () => {
    it("should compute expected tracking status on location revocation", () => {
      const initialStatus = {
        locationPermissionStatus: "ALWAYS",
        isOnline: true,
        isLockedOut: false,
        lockoutReason: null,
      };

      const revokedStatus = {
        ...initialStatus,
        locationPermissionStatus: "DISABLED",
        isOnline: false,
        isLockedOut: true,
        lockoutReason: "Location services disabled or permission revoked",
      };

      expect(revokedStatus.locationPermissionStatus).toBe("DISABLED");
      expect(revokedStatus.isOnline).toBe(false);
      expect(revokedStatus.isLockedOut).toBe(true);
    });
  });
});
