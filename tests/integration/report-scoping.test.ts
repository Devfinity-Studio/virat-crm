import { describe, it, expect } from "vitest";
import { resolveReportTargetUsers } from "../../src/server/lib/reports";
import { TRPCError } from "@trpc/server";

describe("Phase 49: Report Scoping & Hierarchy Aggregation", () => {
  // Mock DB structure
  const createMockDb = () => {
    return {
      query: {
        userManagers: {
          findMany: async ({ where }: any) => {
            // manager-1 has subordinates: emp-1, emp-2
            return [{ userId: "emp-1" }, { userId: "emp-2" }];
          },
        },
        users: {
          findMany: async ({ where }: any) => {
            // Mock branch users: branch 2 has user-b2-1 and user-b2-2
            return [{ id: "user-b2-1" }, { id: "user-b2-2" }];
          },
        },
      },
      execute: async (query: any) => {
        // Mock CTE execution for subordinates
        return [{ id: "emp-1" }, { id: "emp-2" }, { id: "emp-sub-3" }];
      },
    };
  };

  describe("REP-01: Employee Scope Enforcement", () => {
    it("should allow an Employee to query their own individual report", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "emp-001", role: "Employee", branchId: 1 },
      };

      const result = await resolveReportTargetUsers(ctx, {
        scope: "individual",
      });

      expect(result).toEqual(["emp-001"]);
    });

    it("should allow an Employee to query individual scope with their own targetId", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "emp-001", role: "Employee", branchId: 1 },
      };

      const result = await resolveReportTargetUsers(ctx, {
        scope: "individual",
        targetId: "emp-001",
      });

      expect(result).toEqual(["emp-001"]);
    });

    it("should throw FORBIDDEN if an Employee attempts to query another user's reports", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "emp-001", role: "Employee", branchId: 1 },
      };

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "individual",
          targetId: "emp-002",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "individual",
          targetId: "emp-002",
        }),
      ).rejects.toThrow(/Employees cannot access reports for other team members/);
    });

    it("should throw FORBIDDEN if an Employee attempts to query team scope", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "emp-001", role: "Employee", branchId: 1 },
      };

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "team",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "team",
        }),
      ).rejects.toThrow(/Employees are only permitted to view their own individual reports/);
    });

    it("should throw FORBIDDEN if an Employee attempts to query management scope", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "emp-001", role: "Employee", branchId: 1 },
      };

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "management",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN if an Employee attempts to query branch scope", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "emp-001", role: "Employee", branchId: 1 },
      };

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "branch",
          branchId: 1,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("REP-02: Manager Scope Enforcement & Hierarchy Aggregation", () => {
    it("should allow a Manager to query their own individual report", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "mgr-001", role: "Manager", branchId: 1 },
      };

      const result = await resolveReportTargetUsers(ctx, {
        scope: "individual",
      });

      expect(result).toEqual(["mgr-001"]);
    });

    it("should allow a Manager to query their team scope", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "mgr-001", role: "Manager", branchId: 1 },
      };

      const result = await resolveReportTargetUsers(ctx, {
        scope: "team",
      });

      expect(result).toEqual(["emp-1", "emp-2"]);
    });

    it("should allow a Manager to query management hierarchy scope recursively", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "mgr-001", role: "Manager", branchId: 1 },
      };

      const result = await resolveReportTargetUsers(ctx, {
        scope: "management",
      });

      expect(result).toEqual(["emp-1", "emp-2", "emp-sub-3"]);
    });

    it("should throw FORBIDDEN if a Manager attempts to query branch scope", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "mgr-001", role: "Manager", branchId: 1 },
      };

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "branch",
          branchId: 1,
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "branch",
          branchId: 1,
        }),
      ).rejects.toThrow(/Managers are not authorized to view branch-wide aggregated reports/);
    });

    it("should throw FORBIDDEN if a Manager targets an unrelated user outside their hierarchy", async () => {
      const mockDb = {
        ...createMockDb(),
        execute: async () => [], // Subordinates check returns empty array
      };
      const ctx = {
        db: mockDb,
        dbUser: { id: "mgr-001", role: "Manager", branchId: 1 },
      };

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "individual",
          targetId: "unrelated-user-999",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        resolveReportTargetUsers(ctx, {
          scope: "individual",
          targetId: "unrelated-user-999",
        }),
      ).rejects.toThrow(/You can only view reports for subordinates within your team hierarchy/);
    });
  });

  describe("REP-03: Admin & Developer Unrestricted Selection", () => {
    it("should allow Admin to query any individual targetId", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "admin-001", role: "Admin", branchId: 1 },
      };

      const result = await resolveReportTargetUsers(ctx, {
        scope: "individual",
        targetId: "emp-any-user",
      });

      expect(result).toEqual(["emp-any-user"]);
    });

    it("should allow Admin to query branch scope for any branch", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "admin-001", role: "Admin", branchId: 1 },
      };

      const result = await resolveReportTargetUsers(ctx, {
        scope: "branch",
        branchId: 2,
      });

      expect(result).toEqual(["user-b2-1", "user-b2-2"]);
    });

    it("should allow Developer to query management hierarchy scope for any manager", async () => {
      const mockDb = createMockDb();
      const ctx = {
        db: mockDb,
        dbUser: { id: "dev-001", role: "Developer", branchId: 1 },
      };

      const result = await resolveReportTargetUsers(ctx, {
        scope: "management",
        targetId: "mgr-any-manager",
      });

      expect(result).toEqual(["emp-1", "emp-2", "emp-sub-3"]);
    });
  });
});
