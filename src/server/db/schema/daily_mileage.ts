import {
  serial,
  numeric,
  timestamp,
  uuid,
  index,
  varchar,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, createTable } from "./users";

export const dailyMileage = createTable(
  "daily_mileage",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    date: varchar("date", { length: 10 }).notNull(), // 'YYYY-MM-DD'
    totalDistanceMeters: numeric("total_distance_meters", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    validPointsCount: integer("valid_points_count").notNull().default(0),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userDateUnique: unique("daily_mileage_user_date_uq").on(
      table.userId,
      table.date,
    ),
    dateIndex: index("daily_mileage_date_idx").on(table.date),
  }),
);

export const dailyMileageRelations = relations(dailyMileage, ({ one }) => ({
  user: one(users, {
    fields: [dailyMileage.userId],
    references: [users.id],
  }),
}));
