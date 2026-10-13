import {
  pgTableCreator,
  varchar,
  uuid,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

export const createTable = pgTableCreator((name) => `virat-crm_${name}`);

export const userDocuments = createTable("user_document", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 256 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  key: varchar("key", { length: 512 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }),
  size: integer("size"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userDocumentsRelations = relations(userDocuments, ({ one }) => ({
  user: one(users, {
    fields: [userDocuments.userId],
    references: [users.id],
  }),
}));
