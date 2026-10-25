import "dotenv/config";
import { db } from "./src/server/db/index.js";
import { rolePermissions } from "./src/server/db/schema/index.js";

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
