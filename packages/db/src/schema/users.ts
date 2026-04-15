import { sql } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["student", "teacher", "admin"]);

export const users = pgTable("users", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  email: text().notNull().unique(),
  nickname: text(),
  avatarUrl: text(),
  role: userRole().notNull().default("student"),
  jlptLevel: text(),
  metadata: jsonb().$type<{ locale?: string; timezone?: string }>(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp({ withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
