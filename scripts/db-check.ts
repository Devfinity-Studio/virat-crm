import "dotenv/config";
import { db } from "@/server/db";
import { employeeLocations } from "@/server/db/schema";
import { gte } from "drizzle-orm";

async function main() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const results = await db
    .select()
    .from(employeeLocations)
    .where(gte(employeeLocations.recordedAt, fifteenMinutesAgo));

  console.log(`Query returned ${results.length} locations in the last 15 minutes.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
