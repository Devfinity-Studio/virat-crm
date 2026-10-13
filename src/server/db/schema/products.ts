import {
  pgTableCreator,
  serial,
  varchar,
  numeric,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `virat-crm_${name}`);

export const products = createTable("product", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  brand: varchar("brand", { length: 256 }),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 100 }),
  hsnCode: varchar("hsn_code", { length: 50 }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  minThreshold: integer("min_threshold").notNull().default(10),
  pointsPerQty: numeric("points_per_qty", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});
