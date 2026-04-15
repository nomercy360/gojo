import { zValidator } from "@hono/zod-validator";
import { users } from "@gojo/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db.ts";

export const usersRoute = new Hono();

usersRoute.get("/", async (c) => {
  const rows = await db.select().from(users).limit(50);
  return c.json(rows);
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
    return c.json(row, 201);
  },
);

usersRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});
