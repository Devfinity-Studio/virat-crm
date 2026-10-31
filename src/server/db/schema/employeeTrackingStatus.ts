import {
  timestamp,
  uuid,
  varchar,
  doublePrecision,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, createTable } from "./users";

export const employeeTrackingStatus = createTable(
  "employee_tracking_status",
  {
    employeeId: uuid("employee_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    lastLatitude: doublePrecision("last_latitude"),
    lastLongitude: doublePrecision("last_longitude"),
    lastAccuracy: real("last_accuracy"),
    lastHeading: real("last_heading"),
    lastSpeed: real("last_speed"),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    locationPermissionStatus: varchar("location_permission_status", {
      length: 32,
    })
      .notNull()
      .default("ALWAYS"), // ALWAYS | WHILE_IN_USE | DENIED | DISABLED
    isOnline: boolean("is_online").default(true).notNull(),
    isLockedOut: boolean("is_locked_out").default(false).notNull(),
    lockoutReason: varchar("lockout_reason", { length: 256 }),
  },
);

export const employeeTrackingStatusRelations = relations(
  employeeTrackingStatus,
  ({ one }) => ({
    employee: one(users, {
      fields: [employeeTrackingStatus.employeeId],
      references: [users.id],
    }),
  }),
);

