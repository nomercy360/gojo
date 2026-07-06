import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const paymentStatus = pgEnum("payment_status", ["pending", "succeeded", "canceled"]);

export const payments = pgTable(
  "payments",
  {
    id: uuid().default(sql`uuidv7()`).primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text().notNull().default("yookassa"),
    providerPaymentId: text(),
    idempotenceKey: text().notNull(),
    planId: text().notNull(),
    amountValue: text().notNull(),
    currency: text().notNull().default("RUB"),
    status: paymentStatus().notNull().default("pending"),
    confirmationUrl: text(),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("payments_provider_payment_id_uniq").on(t.providerPaymentId),
    uniqueIndex("payments_idempotence_key_uniq").on(t.idempotenceKey),
  ],
);

export const studentAccess = pgTable("student_access", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  activeUntil: timestamp({ withTimezone: true }),
  lessonCredits: integer().notNull().default(0),
  trialUsed: boolean().notNull().default(false),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type StudentAccess = typeof studentAccess.$inferSelect;
