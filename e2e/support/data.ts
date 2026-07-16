import {
  bookings,
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

export async function createLeadConversionFixture(input: {
  teacherId: string;
  email: string;
  name: string;
  goal?: string;
  level?: string;
}) {
  const startsAt = new Date(Date.now() - 60 * 60_000);
  const [lesson] = await db
    .insert(lessons)
    .values({
      teacherId: input.teacherId,
      title: `Пробный урок · ${input.name}`,
      status: "completed",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 50 * 60_000),
      maxStudents: 1,
    })
    .returning({ id: lessons.id });
  if (!lesson) throw new Error("Failed to create conversion lesson fixture");

  const [lead] = await db
    .insert(leads)
    .values({
      kind: "quiz",
      status: "trial_done",
      name: input.name,
      email: input.email,
      goal: input.goal,
      level: input.level,
      trialLessonId: lesson.id,
    })
    .returning({ id: leads.id });
  if (!lead) throw new Error("Failed to create conversion lead fixture");
  return { leadId: lead.id, lessonId: lesson.id };
}

export async function getLeadConversion(leadId: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead?.studentId) return { lead, student: undefined, booking: undefined, access: undefined };
  const [student] = await db.select().from(user).where(eq(user.id, lead.studentId)).limit(1);
  const [booking] = lead.trialLessonId
    ? await db.select().from(bookings).where(eq(bookings.lessonId, lead.trialLessonId)).limit(1)
    : [];
  const [access] = await db
    .select()
    .from(studentAccess)
    .where(eq(studentAccess.userId, lead.studentId))
    .limit(1);
  return { lead, student, booking, access };
}

export async function cleanLeadConversionFixture(input: {
  leadId?: string;
  lessonId?: string;
  studentId?: string;
}) {
  if (input.leadId) await db.delete(leads).where(eq(leads.id, input.leadId));
  if (input.lessonId) await db.delete(lessons).where(eq(lessons.id, input.lessonId));
  if (input.studentId) await db.delete(user).where(eq(user.id, input.studentId));
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
      sourceLeadId: null,
      notes: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
  await resetTraining(userId);
  await db
    .insert(studentAccess)
    .values({ userId, trialUsed: false, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: studentAccess.userId,
      set: {
        assignedPlanId: null,
        activeUntil: null,
        lessonCredits: 0,
        trialUsed: false,
        updatedAt: new Date(),
      },
    });
}

export async function getStudentAccess(userId: string) {
  const [row] = await db
    .select()
    .from(studentAccess)
    .where(eq(studentAccess.userId, userId))
    .limit(1);
  return row;
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
