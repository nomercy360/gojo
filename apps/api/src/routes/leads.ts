import { bookings, leads, studentAccess, user as userTable } from "@gojo/db";
import { zValidator } from "@hono/zod-validator";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { notifyLead } from "../lead-notifications.ts";

const leadInput = z.object({
  kind: z.enum(["booking", "guide"]).default("booking"),
  name: z.string().trim().min(1).max(200),
  // Required for "guide" (delivery address) but optional for "booking" —
  // enforced client-side per kind rather than split into two schemas.
  email: z.string().trim().email().max(200).optional(),
  contact: z.string().trim().max(200).optional(),
  level: z.string().trim().max(200).optional(),
  goal: z.string().trim().max(500).optional(),
});

type LeadInput = z.infer<typeof leadInput>;

// Public — the landing lead forms are pre-auth. Kept minimal; add rate limiting
// if it attracts spam.
export const leadsRoute = new Hono();

leadsRoute.post("/", zValidator("json", leadInput), async (c) => {
  const data = c.req.valid("json");
  const [lead] = await db.insert(leads).values(data).returning({ id: leads.id });
  void notifyLead(data); // best-effort; never blocks the response
  return c.json({ ok: true, id: lead?.id }, 201);
});

leadsRoute.post("/link-current", requireAuth, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const linked = await db
    .update(leads)
    .set({ userId: user.id, updatedAt: new Date() })
    .where(and(eq(leads.email, user.email), isNull(leads.userId)))
    .returning({
      id: leads.id,
      kind: leads.kind,
      level: leads.level,
      trialLessonId: leads.trialLessonId,
      createdAt: leads.createdAt,
    });

  const latestQuizLead = linked
    .filter((lead) => lead.kind === "quiz" && lead.level)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (latestQuizLead?.level) {
    await db
      .update(userTable)
      .set({ quizLevel: latestQuizLead.level, updatedAt: new Date() })
      .where(eq(userTable.id, user.id));
  }

  for (const lead of linked) {
    if (!lead.trialLessonId) continue;
    await db
      .insert(bookings)
      .values({ lessonId: lead.trialLessonId, studentId: user.id })
      .onConflictDoNothing({ target: [bookings.lessonId, bookings.studentId] });
    await db
      .insert(studentAccess)
      .values({ userId: user.id, trialUsed: true, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: studentAccess.userId,
        set: { trialUsed: true, updatedAt: new Date() },
      });
  }

  return c.json({ ok: true, linked: linked.length });
});
