/**
 * One-shot: creates a demo completed lesson for exploration.
 * Teacher: sensei@gojo.local (Tanaka-sensei)
 * Student: maxim@email.com (booked, flashcards materialised)
 *
 * Safe to re-run — skips if a lesson with the same title already exists.
 */
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

const url = process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo";
const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema, casing: "snake_case" });

const LESSON_TITLE = "[DEMO] JLPT N5 — 〜ています и 〜てから";

async function run() {
  const [student] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, "maxim@email.com"));
  if (!student) throw new Error("student maxim@email.com not found");

  const [teacher] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, "sensei@gojo.local"));
  if (!teacher) throw new Error("teacher sensei@gojo.local not found");

  const [existing] = await db
    .select()
    .from(schema.lessons)
    .where(eq(schema.lessons.title, LESSON_TITLE))
    .limit(1);
  if (existing) {
    console.log("[demo] lesson already exists, skipping:", existing.id);
    await client.end();
    return;
  }

  const startsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const [lesson] = await db
    .insert(schema.lessons)
    .values({
      teacherId: teacher.id,
      title: LESSON_TITLE,
      status: "completed",
      startsAt,
      endsAt,
      jlptLevel: "N5",
      recordingUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      maxStudents: 8,
    })
    .returning();
  if (!lesson) throw new Error("insert lesson failed");
  console.log("[demo] lesson created:", lesson.id);

  await db
    .insert(schema.bookings)
    .values({ lessonId: lesson.id, studentId: student.id })
    .onConflictDoNothing();

  const cardRows = [
    { word: "勉強", reading: "べんきょう", meaning: "учёба", position: 0 },
    { word: "図書館", reading: "としょかん", meaning: "библиотека", position: 1 },
    { word: "映画", reading: "えいが", meaning: "фильм", position: 2 },
    { word: "友達", reading: "ともだち", meaning: "друг", position: 3 },
    { word: "先生", reading: "せんせい", meaning: "учитель", position: 4 },
  ];
  const cards = await db
    .insert(schema.lessonCards)
    .values(cardRows.map((c) => ({ ...c, lessonId: lesson.id })))
    .returning();
  console.log(`[demo] ${cards.length} lesson_cards inserted`);

  // Varied SRS states so the review UI shows a mix.
  const stageByWord: Record<string, number> = {
    勉強: 2, // Sapling — already reviewing
    図書館: 1, // Sprout
    映画: 0, // Seed
    友達: -1, // unlearned (in deck, not promoted)
    先生: -1,
  };
  const now = new Date();
  const dueInFuture = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const dueNow = new Date(now.getTime() - 60 * 1000);

  for (const card of cards) {
    const stage = stageByWord[card.word] ?? -1;
    await db
      .insert(schema.flashcards)
      .values({
        userId: student.id,
        lessonCardId: card.id,
        word: card.word,
        reading: card.reading,
        meaning: card.meaning,
        stage,
        modifier: "1.00",
        streak: 0,
        lapses: 0,
        // Put a couple cards as due-now so the queue isn't empty.
        due: stage === 0 || stage === 1 ? dueNow : dueInFuture,
        lastReview: stage >= 0 ? new Date(now.getTime() - 4 * 60 * 60 * 1000) : null,
      })
      .onConflictDoNothing({
        target: [schema.flashcards.userId, schema.flashcards.lessonCardId],
      });
  }
  console.log("[demo] flashcards materialised");

  await db.insert(schema.lessonMaterials).values([
    {
      lessonId: lesson.id,
      uploadedBy: teacher.id,
      title: "Конспект урока — 〜ています.pdf",
      fileUrl: "https://www.africau.edu/images/default/sample.pdf",
      fileType: "application/pdf",
    },
    {
      lessonId: lesson.id,
      uploadedBy: teacher.id,
      title: "Словарь урока (изображение)",
      fileUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Hiragana_KA.png/240px-Hiragana_KA.png",
      fileType: "image/png",
    },
  ]);
  console.log("[demo] materials inserted");

  // Sanity check — how does /lessons think about it now?
  const summary = await db
    .select()
    .from(schema.flashcards)
    .where(eq(schema.flashcards.userId, student.id));
  console.log(`[demo] student total flashcards: ${summary.length}`);

  await client.end();
  console.log("[demo] done");
}

await run();
