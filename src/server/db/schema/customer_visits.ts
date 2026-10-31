import {
  serial,
  timestamp,
  uuid,
  index,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, createTable } from "./users";
import { customers } from "./customers";

export const customerVisits = createTable(
  "customer_visits",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    customerId: uuid("customer_id")
      .references(() => customers.id, { onDelete: "cascade" })
      .notNull(),
    date: varchar("date", { length: 10 }).notNull(), // 'YYYY-MM-DD'
    arrivalTime: timestamp("arrival_time", { withTimezone: true })
      .defaultNow()
      .notNull(),
    departureTime: timestamp("departure_time", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
  },
  (table) => ({
    userIdx: index("customer_visits_user_idx").on(table.userId),
    customerIdx: index("customer_visits_customer_idx").on(table.customerId),
    dateIdx: index("customer_visits_date_idx").on(table.date),
  }),
);

export const customerVisitsRelations = relations(customerVisits, ({ one }) => ({
  user: one(users, {
    fields: [customerVisits.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [customerVisits.customerId],
    references: [customers.id],
  }),
}));
