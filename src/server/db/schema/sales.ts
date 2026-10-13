import {
  pgTableCreator,
  serial,
  numeric,
  text,
  varchar,
  timestamp,
  integer,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { branches } from "./branches";
import { saleItems } from "./saleItems";
import { replacements } from "./replacements";
import { files } from "./files";
import { customers } from "./customers";
import { saleAssignments } from "./saleAssignments";

export const createTable = pgTableCreator((name) => `virat-crm_${name}`);

export const sales = createTable(
  "sale",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .references(() => branches.id)
      .notNull(),
    orderDate: timestamp("order_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    invoiceDate: timestamp("invoice_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    orderNumber: varchar("order_number", { length: 100 }).notNull().unique(),
    transactionNumber: varchar("transaction_number", { length: 100 }).unique(),
    cmrId: varchar("cmr_id", { length: 100 }),
    tmNo: varchar("tm_no", { length: 100 }),
    saleType: varchar("sale_type", { length: 100 }).default("Direct to Customer from PU"),
    registerType: varchar("register_type", { length: 50 }).notNull().default("Sale"), // "Sale" or "Advance"
    oldAdvanceOrderNumber: varchar("old_advance_order_number", { length: 100 }), // Reference to old advance order
    status: varchar("status", { length: 50 }).notNull().default("Pending"), // Pending, Approved, Rejected
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // Employee
    managerId: uuid("manager_id").references(() => users.id, {
      onDelete: "set null",
    }), // Field Supervisor
    pincode: varchar("pincode", { length: 20 }),
    addressLine1: varchar("address_line_1", { length: 256 }),
    landmark: varchar("landmark", { length: 256 }),
    area: varchar("area", { length: 256 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    deliveryAddress: text("delivery_address"),
    customerName: varchar("customer_name", { length: 256 }),
    customerAddress: text("customer_address"),
    customerId: uuid("customer_id").references(() => customers.id),

    mainQty: integer("main_qty").notNull().default(0),
    freeQty: integer("free_qty").notNull().default(0),
    totalQty: integer("total_qty").notNull().default(0),

    tradeDiscount: numeric("trade_discount", { precision: 12, scale: 2 }).notNull().default("0"),
    basicInvoiceValue: numeric("basic_invoice_value", { precision: 12, scale: 2 }).notNull().default("0"),
    cgst: numeric("cgst", { precision: 12, scale: 2 }).notNull().default("0"),
    sgst: numeric("sgst", { precision: 12, scale: 2 }).notNull().default("0"),
    igst: numeric("igst", { precision: 12, scale: 2 }).notNull().default("0"),

    invoiceAmount: numeric("invoice_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    advancePaymentAmount: numeric("advance_payment_amount", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    receivedAmount: numeric("received_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    balanceAmount: numeric("balance_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    branchIdx: index("branch_idx").on(table.branchId),
    statusIdx: index("status_idx").on(table.status),
    createdAtIdx: index("created_at_idx").on(table.createdAt),
    userIdIdx: index("user_idx").on(table.userId),
    branchCreatedIdx: index("sales_branch_created_idx").on(
      table.branchId,
      table.createdAt,
    ),
  }),
);

export const salesRelations = relations(sales, ({ one, many }) => ({
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
    relationName: "sale_employee",
  }),
  manager: one(users, {
    fields: [sales.managerId],
    references: [users.id],
    relationName: "sale_supervisor",
  }),
  branch: one(branches, {
    fields: [sales.branchId],
    references: [branches.id],
  }),
  items: many(saleItems),
  replacements: many(replacements),
  files: many(files, { relationName: "sale_files" }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  assignments: many(saleAssignments),
}));
