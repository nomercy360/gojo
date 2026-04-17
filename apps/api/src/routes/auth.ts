import { user as userTable } from "@gojo/db";
import { devLoginInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { auth } from "../auth.ts";
import { type AuthContext } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";

export const authRoute = new Hono<AuthContext>();

/**
 * Dev-only login. Creates or reuses a user by email via better-auth and returns a session.
 * Gated by NODE_ENV + ALLOW_DEV_LOGIN env flag.
 */
authRoute.post("/dev-login", zValidator("json", devLoginInput), async (c) => {
  if (env.NODE_ENV === "production" && !env.ALLOW_DEV_LOGIN) {
    throw new HTTPException(404, { message: "not found" });
  }
  const body = c.req.valid("json");
  const password = "dev-password-123";

  const [existing] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, body.email))
    .limit(1);

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        email: body.email,
        password,
        name: body.nickname ?? body.email.split("@")[0] ?? "user",
        // biome-ignore lint/suspicious/noExplicitAny: better-auth additionalFields dynamic
        ...({ role: body.role, nickname: body.nickname } as any),
      },
    });
  }

  const result = await auth.api.signInEmail({
    body: { email: body.email, password },
    returnHeaders: true,
  });

  // Copy auth cookies to Hono response
  const setCookie = result.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookie) {
    c.header("Set-Cookie", cookie, { append: true });
  }

  return c.json({
    token: result.response.token ?? "",
    user: {
      id: result.response.user.id,
      email: result.response.user.email,
      nickname: (result.response.user as { nickname?: string }).nickname ?? null,
      avatarUrl: result.response.user.image ?? null,
      role: (result.response.user as { role?: string }).role ?? "student",
      jlptLevel: (result.response.user as { jlptLevel?: string }).jlptLevel ?? null,
      createdAt:
        typeof result.response.user.createdAt === "string"
          ? result.response.user.createdAt
          : new Date(result.response.user.createdAt).toISOString(),
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
    jlptLevel: null,
    createdAt: new Date().toISOString(),
  });
});
