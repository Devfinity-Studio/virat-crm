import "dotenv/config";
import { db } from "./src/server/db/index.js";
import { systemSettings } from "./src/server/db/schema/index.js";

async function main() {
  console.log("Fetching system settings from database...");
  const settings = await db.select().from(systemSettings);
  console.log("\n--- System Settings ---");
  for (const s of settings) {
    console.log(
      `ID: ${s.id} | Locked: ${s.isSystemLocked} | Read-Only: ${s.isReadOnly} | Disabled Features: ${s.disabledFeaturesGlobal}`,
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
