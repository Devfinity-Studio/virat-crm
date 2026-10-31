import "dotenv/config";
import { db } from "@/server/db";
import { rolePermissions } from "@/server/db/schema";

async function main() {
  console.log("Fetching role permissions from database...");
  const perms = await db.select().from(rolePermissions);
  console.log("\n--- Role Permissions ---");
  for (const p of perms) {
    console.log(
      `Role: ${p.role} | Feature: ${p.featureKey} | Enabled: ${p.isEnabled}`,
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
