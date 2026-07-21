import { user as userTable } from "@gojo/db";
import { devLoginInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AuthContext } from "../auth/middleware.ts";
import { createSessionCookie, findOrCreateUserByEmail } from "../auth/session.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";

export const authRoute = new Hono<AuthContext>();

/**
 * Dev-only login. Creates or reuses a user by email and returns a passwordless
 * better-auth session (production auth is passwordless). Gated by
 * NODE_ENV + ALLOW_DEV_LOGIN env flag.
 */
authRoute.post("/dev-login", zValidator("json", devLoginInput), async (c) => {
  if (env.NODE_ENV === "production" && !env.ALLOW_DEV_LOGIN) {
    throw new HTTPException(404, { message: "not found" });
  }
  const body = c.req.valid("json");

  const userId = await findOrCreateUserByEmail({
    email: body.email,
    name: body.nickname ?? body.email.split("@")[0] ?? "user",
    role: body.role,
    nickname: body.nickname,
  });

  c.header("Set-Cookie", await createSessionCookie(userId), { append: true });

  const [u] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  return c.json({
    token: "",
    user: {
      id: userId,
      email: u?.email ?? body.email,
      nickname: u?.nickname ?? body.nickname ?? null,
      avatarUrl: u?.image ?? null,
      role: u?.role ?? body.role,
      jlptLevel: u?.jlptLevel ?? null,
      quizLevel: u?.quizLevel ?? null,
      timeZone: u?.timeZone ?? "Europe/Moscow",
      createdAt: (u?.createdAt ?? new Date()).toISOString(),
    },
  });
});

authRoute.get("/me", async (c) => {
  const u = c.get("user");
  if (!u) throw new HTTPException(401, { message: "unauthorized" });
  return c.json({
    id: u.id,
    email: u.email,
    nickname: u.nickname ?? null,
    avatarUrl: u.image ?? null,
    role: u.role,
    jlptLevel: u.jlptLevel ?? null,
    quizLevel: u.quizLevel ?? null,
    timeZone: u.timeZone ?? "Europe/Moscow",
    createdAt: new Date().toISOString(),
  });
});
