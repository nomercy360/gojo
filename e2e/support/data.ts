import {
  createDb,
  leads,
  lessons,
  personalEvents,
  studentAccess,
  trainingTotals,
  user,
} from "@gojo/db";
import { eq } from "drizzle-orm";

const db = createDb(process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo");

export async function findUserId(email: string) {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (!row) throw new Error(`E2E user not found: ${email}`);
  return row.id;
}

export async function grantBookingCredit(userId: string) {
  await db
    .insert(studentAccess)
    .values({ userId, lessonCredits: 1, trialUsed: false, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: studentAccess.userId,
      set: { lessonCredits: 1, trialUsed: false, updatedAt: new Date() },
    });
}

export async function setLessonCapacity(lessonId: string, maxStudents: number) {
  await db.update(lessons).set({ maxStudents }).where(eq(lessons.id, lessonId));
}

export async function getBookingCredits(userId: string) {
  const [access] = await db
    .select({ lessonCredits: studentAccess.lessonCredits })
    .from(studentAccess)
    .where(eq(studentAccess.userId, userId))
    .limit(1);
  return access?.lessonCredits ?? 0;
}

export async function cleanLearningFlow(lessonId: string | undefined, userId: string | undefined) {
  if (lessonId) await db.delete(lessons).where(eq(lessons.id, lessonId));
  if (userId) {
    await db
      .update(studentAccess)
      .set({ lessonCredits: 0, updatedAt: new Date() })
      .where(eq(studentAccess.userId, userId));
  }
}

export async function deleteLead(id: string | undefined) {
  if (id) await db.delete(leads).where(eq(leads.id, id));
}

export async function findLead(id: string) {
  const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return row;
}

export async function deletePersonalEvent(id: string | undefined) {
  if (id) await db.delete(personalEvents).where(eq(personalEvents.id, id));
}

export async function resetTraining(userId: string) {
  await db.delete(trainingTotals).where(eq(trainingTotals.userId, userId));
}

export async function resetMutableStudent(userId: string) {
  await db
    .update(user)
    .set({
      name: "E2E Mutable Student",
      nickname: "E2E Mutable Student",
      image: null,
      telegramId: null,
      quizLevel: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
  await resetTraining(userId);
  await db
    .insert(studentAccess)
    .values({ userId, trialUsed: false, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: studentAccess.userId,
      set: { trialUsed: false, updatedAt: new Date() },
    });
}

export async function setTrialUsed(userId: string, trialUsed: boolean) {
  await db
    .insert(studentAccess)
    .values({ userId, trialUsed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: studentAccess.userId,
      set: { trialUsed, updatedAt: new Date() },
    });
}
