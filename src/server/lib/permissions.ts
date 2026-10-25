import { rolePermissions } from "@/server/db/schema/rolePermissions";
import { roles } from "@/server/db/schema/roles";

export const SYSTEM_FEATURES = [
  "dashboard",
  "sales",
  "crm",
  "reports",
  "workforce",
  "field-support",
  "live-map",
  "analytics",
  "documents",
  "org-chart",
  "inventory",
  "admin",
  "add-employee-without-docs",
] as const;

export type SystemFeatureKey = (typeof SYSTEM_FEATURES)[number];

/**
 * Returns default enabled status for a given role and feature key.
 */
export function getDefaultPermission(role: string, feature: string): boolean {
  if (role === "Admin" || role === "Developer") {
    return true;
  }
  if (role === "Manager") {
    return feature !== "admin" && feature !== "add-employee-without-docs";
  }
  if (role === "Employee") {
    return [
      "dashboard",
      "sales",
      "crm",
      "reports",
      "field-support",
      "documents",
    ].includes(feature);
  }
  return false;
}

/**
 * Ensures all combinations of defined roles and features have corresponding records
 * in rolePermissions table with sensible default enabled values.
 */
export async function syncDefaultRolePermissions(db: any): Promise<number> {
  const existingRoles = await db.select({ name: roles.name }).from(roles);
  const roleNames: string[] = existingRoles.map((r: any) => r.name);

  // Guarantee standard base roles are included in check
  const baseRoles = ["Admin", "Developer", "Manager", "Employee"];
  for (const baseRole of baseRoles) {
    if (!roleNames.includes(baseRole)) {
      roleNames.push(baseRole);
    }
  }

  const existingPerms = await db.select().from(rolePermissions);
  const existingMap = new Set(
    existingPerms.map((p: any) => `${p.role}:${p.featureKey}`),
  );

  const missingEntries: {
    role: string;
    featureKey: string;
    isEnabled: boolean;
  }[] = [];

  for (const role of roleNames) {
    for (const feature of SYSTEM_FEATURES) {
      const key = `${role}:${feature}`;
      if (!existingMap.has(key)) {
        missingEntries.push({
          role,
          featureKey: feature,
          isEnabled: getDefaultPermission(role, feature),
        });
      }
    }
  }

  if (missingEntries.length > 0) {
    await db.insert(rolePermissions).values(missingEntries);
  }

  return missingEntries.length;
}
