import "dotenv/config";
import { db } from "./src/server/db/index.js";
import { users, breadcrumbs } from "./src/server/db/schema/index.js";

async function main() {
  console.log("Fetching users from database...");
  const dbUsers = await db.select().from(users);
  console.log("\n--- Users in Database ---");
  for (const user of dbUsers) {
    console.log(
      `ID: ${user.id} | Email: ${user.email} | Name: ${user.firstName} ${user.lastName} | Role: ${user.role} | Active: ${user.isActive} | Last Lat/Lng: ${user.lastLat}, ${user.lastLng} | Connectivity: ${user.connectivityStatus}`,
    );
  }

  console.log("\nFetching recent breadcrumbs...");
  const recentBc = await db
    .select()
    .from(breadcrumbs)
    .orderBy(breadcrumbs.createdAt);
  console.log("\n--- Recent Breadcrumbs ---");
  for (const bc of recentBc) {
    console.log(
      `User ID: ${bc.userId} | Lat: ${bc.latitude} | Lng: ${bc.longitude} | Created At: ${bc.createdAt.toISOString()}`,
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
