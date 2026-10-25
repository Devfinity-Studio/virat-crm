import postgres from "postgres";

const DATABASE_URL = "postgresql://postgres:password@localhost:5432/virat-crm"; // Fallback to example if .env fails

async function main() {
  const sql = postgres(process.env.DATABASE_URL || DATABASE_URL);

  console.log("Creating enum...");
  try {
    await sql`CREATE TYPE "virat-crm_file_entity_type" AS ENUM ('sale', 'replacement')`;
    console.log("Enum created.");
  } catch (e) {
    console.log("Enum might already exist.");
  }

  console.log("Creating table...");
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "virat-crm_file" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "entity_type" "virat-crm_file_entity_type" NOT NULL,
        "entity_id" integer NOT NULL,
        "key" varchar(512) NOT NULL,
        "original_name" varchar(256) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "size" integer NOT NULL,
        "uploaded_by" uuid NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log("Table created.");
  } catch (e) {
    console.error("Error creating table:", e);
  }

  await sql.end();
}

main().catch(console.error);
