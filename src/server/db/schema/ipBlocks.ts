import {
  pgTableCreator,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

const createTable = pgTableCreator((name) => `virat-crm_${name}`);

/**
 * Tracks failed login attempts and blocks IPs exceeding threshold (e.g. 3 attempts).
 */
export const ipBlocks = createTable(
  "ip_blocks",
  {
    ipAddress: varchar("ip_address", { length: 128 }).primaryKey(),
    failedAttempts: integer("failed_attempts").default(1).notNull(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ip_blocks_blocked_until_idx").on(table.blockedUntil),
  ],
);
