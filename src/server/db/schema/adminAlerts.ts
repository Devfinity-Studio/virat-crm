import {
  timestamp,
  uuid,
  varchar,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, createTable } from "./users";

export const adminAlerts = createTable(
  "admin_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: varchar("type", { length: 64 }).notNull(), // EMPLOYEE_LOCATION_DISABLED | EMPLOYEE_OFFLINE_TIMEOUT | EMPLOYEE_LOGGED_OUT
    employeeId: uuid("employee_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    message: varchar("message", { length: 1024 }).notNull(),
    metadata: varchar("metadata", { length: 2048 }),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdAtIdx: index("admin_alerts_created_at_idx").on(table.createdAt),
    employeeIdIdx: index("admin_alerts_employee_id_idx").on(table.employeeId),
  }),
);

export const adminAlertsRelations = relations(adminAlerts, ({ one }) => ({
  employee: one(users, {
    fields: [adminAlerts.employeeId],
    references: [users.id],
  }),
}));
