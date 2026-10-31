import "dotenv/config";
import { db } from "@/server/db";
import { employeeLocations, users } from "@/server/db/schema";
import { eq, inArray, desc } from "drizzle-orm";

async function main() {
  const visibleUserIds = (await db.select({ id: users.id }).from(users)).map(
    (u) => u.id,
  );

  if (visibleUserIds.length > 0) {
    const locations = await db
      .selectDistinctOn([employeeLocations.employeeId], {
        id: employeeLocations.id,
        employeeId: employeeLocations.employeeId,
        latitude: employeeLocations.latitude,
        longitude: employeeLocations.longitude,
        accuracy: employeeLocations.accuracy,
        recordedAt: employeeLocations.recordedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(employeeLocations)
      .innerJoin(users, eq(employeeLocations.employeeId, users.id))
      .where(inArray(employeeLocations.employeeId, visibleUserIds))
      .orderBy(employeeLocations.employeeId, desc(employeeLocations.recordedAt));

    console.log(`Found ${locations.length} distinct employee locations.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
