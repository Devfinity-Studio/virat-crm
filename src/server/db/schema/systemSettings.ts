import {
  varchar,
  boolean,
  integer,
  jsonb,
  timestamp,
  pgTableCreator,
} from "drizzle-orm/pg-core";

const createTable = pgTableCreator((name) => `virat-crm_${name}`);

export const systemSettings = createTable("system_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  maxUsers: integer("max_users").default(50).notNull(),
  isSystemLocked: boolean("is_system_locked").default(false).notNull(),
  isReadOnly: boolean("is_read_only").default(false).notNull(),
  disabledFeaturesGlobal: jsonb("disabled_features_global")
    .$type<string[]>()
    .default([])
    .notNull(),
  forceUpdateEnabled: boolean("force_update_enabled").default(false).notNull(),
  minAppVersionCode: integer("min_app_version_code").default(1).notNull(),
  latestAppVersionCode: integer("latest_app_version_code").default(5).notNull(),
  minAppVersionName: varchar("min_app_version_name", { length: 32 })
    .default("1.1.0")
    .notNull(),
  latestAppVersionName: varchar("latest_app_version_name", { length: 32 })
    .default("1.1.1")
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
