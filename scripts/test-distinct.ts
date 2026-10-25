import "dotenv/config";
import { db } from "./src/server/db/index.js";
import { breadcrumbs, users } from "./src/server/db/schema/index.js";
import { inArray, desc, eq } from "drizzle-orm";

async function main() {
  console.log("Testing DISTINCT ON query in Drizzle...");
  try {
    const visibleUserIds = [
      "e16e201d-e65f-4130-a6b6-107e6d883eb8",
      "6ef0dcee-9c19-496f-91af-ad375a7f6c4a",
    ];
    const query = db
      .selectDistinctOn([breadcrumbs.userId], {
        id: breadcrumbs.id,
        userId: breadcrumbs.userId,
        latitude: breadcrumbs.latitude,
        longitude: breadcrumbs.longitude,
        accuracy: breadcrumbs.accuracy,
        createdAt: breadcrumbs.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        },
      })
      .from(breadcrumbs)
      .innerJoin(users, eq(breadcrumbs.userId, users.id))
      .where(inArray(breadcrumbs.userId, visibleUserIds))
      .orderBy(breadcrumbs.userId, desc(breadcrumbs.createdAt));

    console.log("SQL generated:", query.toSQL());
    const results = await query;
    console.log(
      `DISTINCT ON query succeeded. Returned ${results.length} rows.`,
    );
    for (const r of results) {
      console.log(
        `User: ${r.user.firstName} ${r.user.lastName} | Lat: ${r.latitude} | Lng: ${r.longitude} | CreatedAt: ${r.createdAt}`,
      );
    }
  } catch (err) {
    console.error("DISTINCT ON query failed:", err);
  }
  process.exit(0);
}

main();
