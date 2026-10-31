import {
  timestamp,
  uuid,
  index,
  doublePrecision,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, createTable } from "./users";

export const employeeLocations = createTable(
  "employee_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    accuracy: real("accuracy"),
    heading: real("heading"),
    speed: real("speed"),
    isOfflineSynced: boolean("is_offline_synced").default(false).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    recordedAtIdx: index("employee_locations_recorded_at_idx").on(table.recordedAt),
    empRecordedAtIdx: index("employee_locations_emp_recorded_at_idx").on(
      table.employeeId,
      table.recordedAt,
    ),
  }),
);

export const employeeLocationsRelations = relations(
  employeeLocations,
  ({ one }) => ({
    employee: one(users, {
      fields: [employeeLocations.employeeId],
      references: [users.id],
    }),
  }),
);
