import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./src/env";
import { sql } from "drizzle-orm";

async function main() {
  const client = postgres(env.DATABASE_URL);
  const db = drizzle(client);

  console.log("Syncing database...");

  // Manually create the enum and table if push is failing interactively
  try {
    await db.execute(
      sql.raw(
        `CREATE TYPE "virat-crm_file_entity_type" AS ENUM ('sale', 'replacement')`,
      ),
    );
    console.log("Enum created.");
  } catch (e) {
    console.log("Enum might already exist.");
  }

  try {
    await db.execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS "virat-crm_file" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "entity_type" "virat-crm_file_entity_type" NOT NULL,
        "entity_id" integer NOT NULL,
        "key" varchar(512) NOT NULL,
        "original_name" varchar(256) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "size" integer NOT NULL,
        "uploaded_by" uuid NOT NULL REFERENCES "virat-crm_user"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `),
    );
    console.log("Table created.");
  } catch (e) {
    console.error("Error creating table:", e);
  }

  await client.end();
}

main().catch(console.error);
