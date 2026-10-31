import "dotenv/config";
import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function setPassword() {
  const employeeCode = process.argv[2];
  const plainPassword = process.argv[3];

  if (!employeeCode || !plainPassword) {
    console.log(
      "Usage: npx tsx scripts/set-password.ts <employeeCode> <password>",
    );
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const [updated] = await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.employeeCode, employeeCode))
    .returning();

  if (updated) {
    console.log(
      `Password set for user: ${updated.firstName} ${updated.lastName} (${updated.employeeCode})`,
    );
  } else {
    console.log(`User with employee code ${employeeCode} not found.`);
  }

  process.exit(0);
}

setPassword().catch((err) => {
  console.error(err);
  process.exit(1);
});

