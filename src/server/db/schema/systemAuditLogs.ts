import {
  pgTableCreator,
  uuid,
  varchar,
  timestamp,
  jsonb,
  text,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

const createTable = pgTableCreator((name) => `virat-crm_${name}`);

export const systemAuditLogs = createTable(
  "system_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: varchar("event_type", { length: 64 }).notNull(), // 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'LOCATION_ALERT' | 'SYSTEM_ERROR' | 'DEVELOPER_ACTION'
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: varchar("user_name", { length: 256 }),
    userEmail: varchar("user_email", { length: 256 }),
    userRole: varchar("user_role", { length: 64 }),
    employeeCode: varchar("employee_code", { length: 64 }),
    action: varchar("action", { length: 256 }).notNull(),
    details: text("details"),
    status: varchar("status", { length: 32 }).notNull().default("INFO"), // 'SUCCESS' | 'FAILURE' | 'WARNING' | 'INFO'
    ipAddress: varchar("ip_address", { length: 128 }),
    userAgent: varchar("user_agent", { length: 512 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("system_audit_logs_event_type_idx").on(table.eventType),
    index("system_audit_logs_created_at_idx").on(table.createdAt),
    index("system_audit_logs_user_id_idx").on(table.userId),
  ],
);

export const systemAuditLogsRelations = relations(systemAuditLogs, ({ one }) => ({
  user: one(users, {
    fields: [systemAuditLogs.userId],
    references: [users.id],
  }),
}));
