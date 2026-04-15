import { eq } from "drizzle-orm";
import { createDb } from "./index.ts";
import { lessons, users } from "./schema/index.ts";

const url = process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo";
const db = createDb(url);

console.log("seeding...");

const [teacher] = await db
  .insert(users)
  .values({
    email: "sensei@gojo.local",
    nickname: "Tanaka-sensei",
    role: "teacher",
    jlptLevel: "N1",
  })
  .onConflictDoNothing()
  .returning();

const teacherId =
  teacher?.id ??
  (await db.select().from(users).where(eq(users.email, "sensei@gojo.local"))).at(0)?.id;

if (!teacherId) throw new Error("teacher not created");

const now = Date.now();
const hour = 60 * 60 * 1000;

await db
  .insert(lessons)
  .values([
    {
      teacherId,
      title: "Introduction to Hiragana — ひらがな入門",
      startsAt: new Date(now + 2 * hour),
      endsAt: new Date(now + 3 * hour),
    },
    {
      teacherId,
      title: "Keigo в бизнес-общении",
      startsAt: new Date(now + 26 * hour),
      endsAt: new Date(now + 27 * hour),
    },
    {
      teacherId,
      title: "JLPT N3 — грамматика прошлого",
      startsAt: new Date(now + 50 * hour),
      endsAt: new Date(now + 51 * hour),
    },
  ])
  .onConflictDoNothing();

console.log("done");
process.exit(0);
