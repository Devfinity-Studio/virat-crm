import {
  pgTableCreator,
  serial,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sales } from "./sales";
import { users } from "./users";
import { files } from "./files";

import { branches } from "./branches";
import { products } from "./products";

export const createTable = pgTableCreator((name) => `virat-crm_${name}`);

export const replacements = createTable("replacement", {
  id: serial("id").primaryKey(),
  originalSaleId: integer("original_sale_id")
    .references(() => sales.id)
    .notNull(),
  branchId: integer("branch_id")
    .references(() => branches.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 50 }).default("Pending").notNull(),
  replacementType: varchar("replacement_type", { length: 50 }).notNull().default("First Replacement"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

export const replacementItems = createTable("replacement_item", {
  id: serial("id").primaryKey(),
  replacementId: integer("replacement_id")
    .references(() => replacements.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const replacementsRelations = relations(
  replacements,
  ({ one, many }) => ({
    sale: one(sales, {
      fields: [replacements.originalSaleId],
      references: [sales.id],
    }),
    user: one(users, {
      fields: [replacements.userId],
      references: [users.id],
    }),
    branch: one(branches, {
      fields: [replacements.branchId],
      references: [branches.id],
    }),
    files: many(files, { relationName: "replacement_files" }),
    items: many(replacementItems),
  }),
);

export const replacementItemsRelations = relations(
  replacementItems,
  ({ one }) => ({
    replacement: one(replacements, {
      fields: [replacementItems.replacementId],
      references: [replacements.id],
    }),
    product: one(products, {
      fields: [replacementItems.productId],
      references: [products.id],
    }),
  }),
);
