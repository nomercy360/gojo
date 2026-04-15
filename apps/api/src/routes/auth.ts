import { sessions, users } from "@gojo/db";
import { devLoginInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { signSession } from "../auth/jwt.ts";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";
import { toUserDto } from "./mappers.ts";

export const authRoute = new Hono<AuthContext>();

/**
 * Dev-only login. Creates or reuses a user by email and returns a JWT.
 * Real Telegram/VK/Yandex OAuth flows replace this later.
 */
authRoute.post("/dev-login", zValidator("json", devLoginInput), async (c) => {
  if (env.NODE_ENV === "production") {
    throw new HTTPException(404, { message: "not found" });
  }
  const body = c.req.valid("json");

  const [existing] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  const user =
    existing ??
    (
      await db
        .insert(users)
        .values({ email: body.email, nickname: body.nickname, role: body.role })
        .returning()
    )[0];

  if (!user) throw new HTTPException(500, { message: "failed to create user" });

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      tokenHash: crypto.randomUUID(),
      expiresAt,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("x-forwarded-for") ?? null,
    })
    .returning();

  if (!session) throw new HTTPException(500, { message: "failed to create session" });

  const token = await signSession({ sub: user.id, sid: session.id, role: user.role });
  return c.json({ token, user: toUserDto(user) });
});

authRoute.get("/me", requireAuth, async (c) => {
  const auth = c.get("auth");
  const [user] = await db.select().from(users).where(eq(users.id, auth.sub)).limit(1);
  if (!user) throw new HTTPException(404, { message: "user not found" });
  return c.json(toUserDto(user));
});
