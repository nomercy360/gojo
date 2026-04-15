import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { JwtPayload } from "./jwt.ts";
import { verifySession } from "./jwt.ts";

export type AuthContext = {
  Variables: {
    auth: JwtPayload;
  };
};

export const requireAuth = createMiddleware<AuthContext>(async (c, next) => {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "missing bearer token" });
  }
  try {
    const payload = await verifySession(header.slice(7));
    c.set("auth", payload);
  } catch {
    throw new HTTPException(401, { message: "invalid or expired token" });
  }
  await next();
});
