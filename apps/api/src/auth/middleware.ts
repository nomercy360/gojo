import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "../auth.ts";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "student" | "teacher" | "admin";
  nickname?: string | null;
  image?: string | null;
};

export type AuthContext = {
  Variables: {
    user: SessionUser | null;
    session: { id: string; userId: string; token: string } | null;
  };
};

/**
 * Loads better-auth session into Hono context. Attach globally via `app.use("*", loadSession)`.
 */
export const loadSession = createMiddleware<AuthContext>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (result) {
    c.set("user", result.user as unknown as SessionUser);
    c.set("session", result.session as unknown as AuthContext["Variables"]["session"]);
  } else {
    c.set("user", null);
    c.set("session", null);
  }
  await next();
});

export const requireAuth = createMiddleware<AuthContext>(async (c, next) => {
  const user = c.get("user");
  if (!user) throw new HTTPException(401, { message: "unauthorized" });
  await next();
});

export const requireTeacher = createMiddleware<AuthContext>(async (c, next) => {
  const user = c.get("user");
  if (!user) throw new HTTPException(401, { message: "unauthorized" });
  if (user.role !== "teacher" && user.role !== "admin") {
    throw new HTTPException(403, { message: "teacher access required" });
  }
  await next();
});
