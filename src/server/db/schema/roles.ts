import {
  varchar,
  boolean,
  timestamp,
  pgTableCreator,
} from "drizzle-orm/pg-core";

const createTable = pgTableCreator((name) => `virat-crm_${name}`);

export const roles = createTable("roles", {
  name: varchar("name", { length: 64 }).primaryKey(),
  description: varchar("description", { length: 256 }),
  codeSeries: varchar("code_series", { length: 32 }),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
