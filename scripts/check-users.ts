import "dotenv/config";
import { db } from "@/server/db";
import { users, employeeLocations, employeeTrackingStatus } from "@/server/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  console.log("Fetching users from database...");
  const dbUsers = await db.select().from(users);
  console.log("\n--- Users in Database ---");
  for (const user of dbUsers) {
    console.log(
      `ID: ${user.id} | Email: ${user.email} | Name: ${user.firstName} ${user.lastName} | Role: ${user.role} | Active: ${user.isActive} | Last Lat/Lng: ${user.lastLat}, ${user.lastLng} | Connectivity: ${user.connectivityStatus}`,
    );
  }

  console.log("\nFetching recent employee locations...");
  const recentLocs = await db
    .select()
    .from(employeeLocations)
    .orderBy(desc(employeeLocations.recordedAt))
    .limit(20);
  console.log("\n--- Recent Employee Locations ---");
  for (const loc of recentLocs) {
    console.log(
      `Employee ID: ${loc.employeeId} | Lat: ${loc.latitude} | Lng: ${loc.longitude} | Recorded At: ${loc.recordedAt.toISOString()}`,
    );
  }

  const statuses = await db.select().from(employeeTrackingStatus);
  console.log(`\nFound ${statuses.length} tracking statuses.`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
