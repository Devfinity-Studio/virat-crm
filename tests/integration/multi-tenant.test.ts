import "dotenv/config";
import { describe, it, expect } from "vitest";
import { enforceBranchIsolation } from "../../src/server/api/trpc";
import { TRPCError } from "@trpc/server";

describe("Multi-Tenant Isolation", () => {
  it("should allow Developer to bypass isolation checks", () => {
    const ctx = {
      dbUser: { role: "Developer", branchId: 1 },
    };

    // Developer requesting data from branch 2
    const result = enforceBranchIsolation(ctx, 2);
    expect(result).toBe(2);
  });

  it("should allow Admin to bypass isolation checks", () => {
    const ctx = {
      dbUser: { role: "Admin", branchId: 1 },
    };

    // Admin requesting data from branch 3
    const result = enforceBranchIsolation(ctx, 3);
    expect(result).toBe(3);
  });

  it("should return user's branchId for standard user with no target branch", () => {
    const ctx = {
      dbUser: { role: "Employee", branchId: 5 },
    };

    const result = enforceBranchIsolation(ctx);
    expect(result).toBe(5);
  });

  it("should throw FORBIDDEN if standard user tries to target a different branch", () => {
    const ctx = {
      dbUser: { role: "Employee", branchId: 5 },
    };

    // Employee assigned to branch 5 requesting data from branch 2
    expect(() => enforceBranchIsolation(ctx, 2)).toThrow(TRPCError);
    expect(() => enforceBranchIsolation(ctx, 2)).toThrow(/Access Denied/);
  });

  it("should throw FORBIDDEN if user has no branch assignment", () => {
    const ctx = {
      dbUser: { role: "Employee", branchId: null },
    };

    expect(() => enforceBranchIsolation(ctx)).toThrow(TRPCError);
    expect(() => enforceBranchIsolation(ctx)).toThrow(/no branch assignment/);
  });

  it("should throw UNAUTHORIZED if user profile is missing", () => {
    const ctx = {
      dbUser: null,
    };

    expect(() => enforceBranchIsolation(ctx)).toThrow(TRPCError);
    expect(() => enforceBranchIsolation(ctx)).toThrow(/User profile not found/);
  });
});
