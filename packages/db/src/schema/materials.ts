import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { lessons } from "./lessons.ts";

export const lessonMaterials = pgTable("lesson_materials", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  lessonId: uuid()
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  uploadedBy: text()
    .notNull()
    .references(() => user.id),
  title: text().notNull(),
  fileUrl: text().notNull(),
  fileType: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type LessonMaterial = typeof lessonMaterials.$inferSelect;
export type NewLessonMaterial = typeof lessonMaterials.$inferInsert;
