import "dotenv/config";
import { db } from "./src/server/db/index.js";
import { sql } from "drizzle-orm";
import { breadcrumbs } from "./src/server/db/schema/index.js";
import { gte } from "drizzle-orm";

async function main() {
  console.log("--- Time diagnostics ---");
  const dbTimeRes = await db.execute(
    sql`SELECT now(), current_setting('TIMEZONE')`,
  );
  console.log("Database now() and TIMEZONE setting:", dbTimeRes);

  const jsNow = new Date();
  console.log("Local JS Date (now):", jsNow.toString());
  console.log("Local JS Date ISO String:", jsNow.toISOString());

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  console.log("15 minutes ago JS Date ISO:", fifteenMinutesAgo.toISOString());

  // Let's run the actual query that getLiveTeam runs
  const query = db
    .select()
    .from(breadcrumbs)
    .where(gte(breadcrumbs.createdAt, fifteenMinutesAgo));
  console.log("Drizzle SQL Query generated:", query.toSQL());

  const results = await query;
  console.log(`Query returned ${results.length} breadcrumbs.`);
  for (const row of results) {
    console.log(
      `- Id: ${row.id}, UserId: ${row.userId}, CreatedAt (Raw/JS): ${row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt}`,
    );
  }

  process.exit(0);
}

main().catch(console.error);
