/**
 * Dev seed: creates a teacher (via raw insert since better-auth is in the API package)
 * and 3 lessons. Uses crypto.randomUUID for IDs matching better-auth's text primary key.
 */
import { eq } from "drizzle-orm";
import { createDb } from "./index.ts";
import { account, lessons, user as userTable } from "./schema/index.ts";

const url = process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo";
const db = createDb(url);

console.log("seeding...");

const email = "sensei@gojo.local";
let teacher = (
  await db.select().from(userTable).where(eq(userTable.email, email)).limit(1)
)[0];

if (!teacher) {
  const id = crypto.randomUUID();
  [teacher] = await db
    .insert(userTable)
    .values({
      id,
      email,
      name: "Tanaka-sensei",
      nickname: "Tanaka-sensei",
      role: "teacher",
      jlptLevel: "N1",
      emailVerified: true,
    })
    .returning();

  // Dummy account entry so the user can still auth via email/password later
  // (hash equivalent to "password123" — replace in better-auth recreate flow)
  await db.insert(account).values({
    id: crypto.randomUUID(),
    userId: id,
    providerId: "credential",
    accountId: id,
    password: "seed-placeholder-use-reset-password",
  });
}

if (!teacher) throw new Error("teacher not created");
const teacherId = teacher.id;

const now = Date.now();
const hour = 60 * 60 * 1000;

await db
  .insert(lessons)
  .values([
    {
      teacherId,
      title: "Introduction to Hiragana — ひらがな入門",
      jlptLevel: "N5",
      startsAt: new Date(now + 2 * hour),
      endsAt: new Date(now + 3 * hour),
    },
    {
      teacherId,
      title: "Keigo в бизнес-общении",
      jlptLevel: "N3",
      startsAt: new Date(now + 26 * hour),
      endsAt: new Date(now + 27 * hour),
    },
    {
      teacherId,
      title: "JLPT N3 — грамматика прошлого",
      jlptLevel: "N3",
      startsAt: new Date(now + 50 * hour),
      endsAt: new Date(now + 51 * hour),
    },
  ])
  .onConflictDoNothing();

console.log("done");
process.exit(0);
