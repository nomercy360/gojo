import { bookings, flashcards, lessonCards } from "@gojo/db";
import { eq } from "drizzle-orm";
import { db } from "../db.ts";

/**
 * Create flashcard rows for every lesson_card of a lesson, for one student.
 * Idempotent via the (user_id, lesson_card_id) unique index — re-running is safe.
 * Called on booking.
 */
export async function materializeCardsForBooking(userId: string, lessonId: string) {
  const templates = await db
    .select()
    .from(lessonCards)
    .where(eq(lessonCards.lessonId, lessonId));
  if (templates.length === 0) return 0;

  const rows = templates.map((t) => ({
    userId,
    lessonCardId: t.id,
    word: t.word,
    reading: t.reading,
    meaning: t.meaning,
  }));
  const result = await db.insert(flashcards).values(rows).onConflictDoNothing({
    target: [flashcards.userId, flashcards.lessonCardId],
  });
  return result.count ?? 0;
}

/**
 * When a teacher adds a new card to a lesson that already has bookings, fan the
 * template out to every booked student so their SRS deck stays in sync.
 */
export async function materializeNewCardForBookings(lessonCardId: string) {
  const [template] = await db
    .select()
    .from(lessonCards)
    .where(eq(lessonCards.id, lessonCardId))
    .limit(1);
  if (!template) return 0;

  const students = await db
    .select({ studentId: bookings.studentId })
    .from(bookings)
    .where(eq(bookings.lessonId, template.lessonId));
  if (students.length === 0) return 0;

  const rows = students.map((s) => ({
    userId: s.studentId,
    lessonCardId: template.id,
    word: template.word,
    reading: template.reading,
    meaning: template.meaning,
  }));
  const result = await db.insert(flashcards).values(rows).onConflictDoNothing({
    target: [flashcards.userId, flashcards.lessonCardId],
  });
  return result.count ?? 0;
}
