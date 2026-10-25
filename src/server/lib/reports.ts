import { sql, eq } from "drizzle-orm";
import { users, userManagers } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export interface ResolveReportScopeInput {
  scope: "individual" | "team" | "management" | "branch";
  targetId?: string;
  branchId?: number;
}

/**
 * Resolves the array of user IDs targeted by a report query based on role authorization:
 * - REP-01 (Employee): Constrained strictly to `individual` scope and their own user ID.
 * - REP-02 (Manager): Can view individual reports or aggregate team/management hierarchy subtrees.
 * - REP-03 (Admin & Developer): Unrestricted selection across any employee, manager team, or branch.
 */
export async function resolveReportTargetUsers(
  ctx: { db: any; dbUser: { id: string; role: string; branchId: number | null } },
  input: ResolveReportScopeInput,
): Promise<string[]> {
  const { db, dbUser } = ctx;

  // 1. Employee Scope Enforcement (REP-01)
  if (dbUser.role === "Employee") {
    if (input.scope !== "individual") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Employees are only permitted to view their own individual reports.",
      });
    }
    if (input.targetId && input.targetId !== dbUser.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Employees cannot access reports for other team members.",
      });
    }
    return [dbUser.id];
  }

  // 2. Manager Scope Enforcement (REP-02)
  if (dbUser.role === "Manager") {
    if (input.scope === "branch") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Managers are not authorized to view branch-wide aggregated reports.",
      });
    }

    const effectiveManagerId = input.targetId ?? dbUser.id;

    // If manager targets someone else, verify target is in their subordinate tree
    if (input.targetId && input.targetId !== dbUser.id) {
      const descendantsQuery = sql`
        WITH RECURSIVE subordinates AS (
          SELECT user_id as id FROM "virat-crm_user_managers" WHERE manager_id = ${dbUser.id}
          UNION
          SELECT um.user_id as id FROM "virat-crm_user_managers" um
          INNER JOIN subordinates s ON s.id = um.manager_id
        )
        SELECT id FROM subordinates WHERE id = ${input.targetId};
      `;
      const rows = (await db.execute(descendantsQuery)) as unknown as { id: string }[];
      if (rows.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view reports for subordinates within your team hierarchy.",
        });
      }
    }

    if (input.scope === "individual") {
      return [effectiveManagerId];
    }

    if (input.scope === "team") {
      const teamMappings = await db.query.userManagers.findMany({
        where: eq(userManagers.managerId, effectiveManagerId),
      });
      return teamMappings.map((m: any) => m.userId);
    }

    if (input.scope === "management") {
      const descendantsQuery = sql`
        WITH RECURSIVE subordinates AS (
          SELECT user_id as id FROM "virat-crm_user_managers" WHERE manager_id = ${effectiveManagerId}
          UNION
          SELECT um.user_id as id FROM "virat-crm_user_managers" um
          INNER JOIN subordinates s ON s.id = um.manager_id
        )
        SELECT id FROM subordinates;
      `;
      const rows = (await db.execute(descendantsQuery)) as unknown as { id: string }[];
      return rows.map((r: any) => String(r.id));
    }
  }

  // 3. Admin & Developer Scope (REP-03)
  const effectiveId = input.targetId ?? dbUser.id;

  if (input.scope === "individual") {
    return [effectiveId];
  }

  if (input.scope === "team") {
    const teamMappings = await db.query.userManagers.findMany({
      where: eq(userManagers.managerId, effectiveId),
    });
    return teamMappings.map((m: any) => m.userId);
  }

  if (input.scope === "branch") {
    const targetBranchId = input.branchId ?? dbUser.branchId;
    if (!targetBranchId) {
      const allUsers = await db.query.users.findMany({
        columns: { id: true },
      });
      return allUsers.map((u: any) => u.id);
    }
    const branchUsers = await db.query.users.findMany({
      where: eq(users.branchId, targetBranchId),
      columns: { id: true },
    });
    return branchUsers.map((u: any) => u.id);
  }

  if (input.scope === "management") {
    const descendantsQuery = sql`
      WITH RECURSIVE subordinates AS (
        SELECT user_id as id FROM "virat-crm_user_managers" WHERE manager_id = ${effectiveId}
        UNION
        SELECT um.user_id as id FROM "virat-crm_user_managers" um
        INNER JOIN subordinates s ON s.id = um.manager_id
      )
      SELECT id FROM subordinates;
    `;
    const rows = (await db.execute(descendantsQuery)) as unknown as { id: string }[];
    return rows.map((r: any) => String(r.id));
  }

  return [effectiveId];
}
