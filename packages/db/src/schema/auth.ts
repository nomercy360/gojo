/**
 * Better Auth schema. Table names match better-auth defaults.
 * Additional fields (role, nickname, avatarUrl, etc.) live on user via
 * better-auth's `user.additionalFields` config.
 */
import {
  bigint,
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["student", "admin"]);

export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),

    role: userRole().notNull().default("student"),
    nickname: text(),
    /** Official level, set by a teacher after the free consultation lesson. */
    jlptLevel: text(),
    /** Indicative self-assessment from the onboarding quiz — shown to the student, never authoritative. */
    quizLevel: text(),
    /** Position on the 30-level curriculum ladder. Advancement is gated (SRS coverage + homework), not self-served. */
    currentLevel: integer().notNull().default(1),
    telegramId: bigint({ mode: "number" }).unique(),
    telegramUsername: text().unique(),
    /** Stamped by the session-create hook on every login (magic link, code, Telegram). Null = never entered the platform. */
    lastLoginAt: timestamp({ withTimezone: true }),
    /** Canonical lead this account was created from. Kept as UUID without a schema FK to avoid a circular table declaration. */
    sourceLeadId: uuid(),
    /** Internal teacher note copied from the source lead's learning goal. */
    notes: text(),
    personalDataConsentAt: timestamp({ withTimezone: true }),
    personalDataConsentVersion: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_source_lead_id_uniq").on(t.sourceLeadId)],
);

export const session = pgTable("session", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  idToken: text(),
  password: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
