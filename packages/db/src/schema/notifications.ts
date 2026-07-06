import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const notificationLogs = pgTable("notification_logs", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  userId: text().references(() => user.id, { onDelete: "set null" }),
  event: text().notNull(),
  channel: text().notNull(),
  recipient: text().notNull(),
  status: text().notNull(),
  error: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type NewNotificationLog = typeof notificationLogs.$inferInsert;
