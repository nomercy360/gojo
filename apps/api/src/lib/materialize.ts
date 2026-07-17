import { bookings, flashcards, lessonCards, lessons, levelVocab, units, user } from "@gojo/db";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db.ts";

/**
 * Create flashcard rows for every lesson_card of a lesson, for one student.
 * Idempotent via the (user_id, lesson_card_id) unique index — re-running is safe.
 * Called when a student's booking is marked attended — not on booking itself,
 * so the deck only reveals a lesson's vocab once the lesson actually happened.
 */
export async function materializeCardsForAttendance(userId: string, lessonId: string) {
  const templates = await db.select().from(lessonCards).where(eq(lessonCards.lessonId, lessonId));
  if (templates.length === 0) return 0;

  const rows = templates.map((t) => ({
    userId,
    lessonCardId: t.id,
    word: t.word,
    reading: t.reading,
    meaning: t.meaning,
  }));
  // Target-less: skips both re-materialisation duplicates (userId,
  // lessonCardId) and cross-source word duplicates (userId, word).
  const result = await db.insert(flashcards).values(rows).onConflictDoNothing();
  return result.count ?? 0;
}

/**
 * The unit half of "пройден": when an attended lesson teaches a curriculum
 * unit, the unit's vocab joins the student's SRS deck and the unit's level
 * unlocks. Idempotent two ways — (userId, levelVocabId) guards re-marking the
 * same unit, and the global (userId, word) index deduplicates a word that
 * already arrived from another unit or a lesson supplement (a word is learned
 * once; conflicts are silently skipped, not errors).
 */
export async function materializeUnitDeckForAttendance(userId: string, lessonId: string) {
  const [row] = await db
    .select({ unitId: units.id, levelId: units.levelId })
    .from(lessons)
    .innerJoin(units, eq(units.id, lessons.unitId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!row) return 0;

  const vocab = await db.select().from(levelVocab).where(eq(levelVocab.unitId, row.unitId));
  let added = 0;
  if (vocab.length > 0) {
    const rows = vocab.map((v) => ({
      userId,
      levelVocabId: v.id,
      word: v.word,
      reading: v.reading,
      meaning: v.meaningRu ?? v.meaningEn,
    }));
    const result = await db.insert(flashcards).values(rows).onConflictDoNothing();
    added = result.count ?? 0;
  }

  // Same "пройден" unlocks the unit's level on the 1-30 ladder — one event
  // drives both card ingest and progression, never a separate mechanism.
  await db
    .update(user)
    .set({
      currentLevel: sql`greatest(${user.currentLevel}, ${row.levelId})`,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  return added;
}

/**
 * When a teacher adds a new card to a lesson that already has attended
 * bookings, fan the template out to those students so their SRS deck stays
 * in sync. Students who haven't attended yet get the full current card set
 * (including this one) when their own attendance is marked.
 */
export async function materializeNewCardForAttendedBookings(lessonCardId: string) {
  const [template] = await db
    .select()
    .from(lessonCards)
    .where(eq(lessonCards.id, lessonCardId))
    .limit(1);
  if (!template) return 0;

  const students = await db
    .select({ studentId: bookings.studentId })
    .from(bookings)
    .where(
      and(eq(bookings.lessonId, template.lessonId), eq(bookings.attendanceStatus, "attended")),
    );
  if (students.length === 0) return 0;

  const rows = students.map((s) => ({
    userId: s.studentId,
    lessonCardId: template.id,
    word: template.word,
    reading: template.reading,
    meaning: template.meaning,
  }));
  const result = await db.insert(flashcards).values(rows).onConflictDoNothing();
  return result.count ?? 0;
}
