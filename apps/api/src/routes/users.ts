import { users } from "@gojo/db";
import { updateProfileInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { type AuthContext, requireAuth } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { putObject } from "../s3.ts";
import { toUserDto } from "./mappers.ts";

export const usersRoute = new Hono<AuthContext>();

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

usersRoute.get("/", async (c) => {
  const rows = await db.select().from(users).limit(50);
  return c.json(rows.map(toUserDto));
});

usersRoute.post(
  "/",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      nickname: z.string().optional(),
      role: z.enum(["student", "teacher", "admin"]).default("student"),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json");
    const [row] = await db.insert(users).values(body).returning();
    if (!row) throw new HTTPException(500, { message: "failed to create user" });
    return c.json(toUserDto(row), 201);
  },
);

usersRoute.patch("/me", requireAuth, zValidator("json", updateProfileInput), async (c) => {
  const auth = c.get("auth");
  const body = c.req.valid("json");

  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (body.nickname !== undefined) patch.nickname = body.nickname;
  if (body.avatarUrl !== undefined) patch.avatarUrl = body.avatarUrl || null;

  const [row] = await db.update(users).set(patch).where(eq(users.id, auth.sub)).returning();
  if (!row) throw new HTTPException(404, { message: "user not found" });
  return c.json(toUserDto(row));
});

usersRoute.post("/me/avatar", requireAuth, async (c) => {
  const auth = c.get("auth");
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: "file is required" });
  }
  if (file.size === 0) throw new HTTPException(400, { message: "empty file" });
  if (file.size > MAX_AVATAR_BYTES) {
    throw new HTTPException(413, { message: "file too large (max 2MB)" });
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new HTTPException(415, { message: `unsupported type: ${file.type}` });
  }

  const ext = file.type.split("/")[1] ?? "bin";
  const key = `avatars/${auth.sub}/${Date.now()}.${ext}`;
  const body = new Uint8Array(await file.arrayBuffer());
  const url = await putObject(key, body, file.type);

  const [row] = await db
    .update(users)
    .set({ avatarUrl: url, updatedAt: new Date() })
    .where(eq(users.id, auth.sub))
    .returning();
  if (!row) throw new HTTPException(404, { message: "user not found" });
  return c.json(toUserDto(row));
});

usersRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(toUserDto(row));
});
