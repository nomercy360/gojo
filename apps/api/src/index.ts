import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { env } from "./env.ts";
import { authRoute } from "./routes/auth.ts";
import { lessonsRoute } from "./routes/lessons.ts";
import { livekitRoute } from "./routes/livekit.ts";
import { teacherRoute } from "./routes/teacher.ts";
import { usersRoute } from "./routes/users.ts";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

app.get("/health", (c) => c.json({ ok: true, service: "gojo-api" }));

app.route("/auth", authRoute);
app.route("/users", usersRoute);
app.route("/lessons", lessonsRoute);
app.route("/livekit", livekitRoute);
app.route("/teacher", teacherRoute);

console.log(`api listening on :${env.API_PORT}`);

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
