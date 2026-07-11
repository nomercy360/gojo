import "./instrument.ts"; // must load first — see @sentry/bun docs

import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { auth } from "./auth.ts";
import { type AuthContext, loadSession } from "./auth/middleware.ts";
import { env } from "./env.ts";
import { startReminderLoop } from "./reminders.ts";
import { authRoute } from "./routes/auth.ts";
import { homeworkRoute } from "./routes/homework.ts";
import { kanjiRoute } from "./routes/kanji.ts";
import { leadsRoute } from "./routes/leads.ts";
import { lessonsRoute } from "./routes/lessons.ts";
import { levelsRoute } from "./routes/levels.ts";
import { livekitRoute } from "./routes/livekit.ts";
import { onboardingRoute } from "./routes/onboarding.ts";
import { paymentsRoute } from "./routes/payments.ts";
import { personalEventsRoute } from "./routes/personal-events.ts";
import { reviewRoute } from "./routes/review.ts";
import { teacherRoute } from "./routes/teacher.ts";
import { trainingRoute } from "./routes/training.ts";
import { usersRoute } from "./routes/users.ts";

const app = new Hono<AuthContext>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.TRUSTED_ORIGINS?.split(",").map((s) => s.trim()) ?? "*",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  Sentry.captureException(err);
  return c.json({ error: "internal_error" }, 500);
});

// Better-auth mounted FIRST at /auth/* — handles /sign-in, /sign-up, /sign-out, /get-session, etc.
app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

// Load session for all non-better-auth routes
app.use("*", loadSession);

app.get("/health", (c) => c.json({ ok: true, service: "gojo-api" }));

// Public landing lead forms (book-a-lesson / get-the-guide) — no auth.
app.route("/leads", leadsRoute);

// Custom dev-login lives under /dev-auth to avoid conflicting with better-auth
app.route("/dev-auth", authRoute);
app.route("/users", usersRoute);
app.route("/lessons", lessonsRoute);
app.route("/livekit", livekitRoute);
app.route("/teacher", teacherRoute);
app.route("/onboarding", onboardingRoute);
app.route("/payments", paymentsRoute);
app.route("/personal-events", personalEventsRoute);
app.route("/review", reviewRoute);
app.route("/kanji", kanjiRoute);
app.route("/training", trainingRoute);
app.route("/homework", homeworkRoute);
app.route("/levels", levelsRoute);

startReminderLoop();

if (env.NODE_ENV === "production" && env.ALLOW_DEV_LOGIN) {
  console.warn(
    "⚠️  SECURITY: ALLOW_DEV_LOGIN is enabled in production — the /dev-auth/dev-login " +
      "endpoint can mint arbitrary sessions (including admin). Unset ALLOW_DEV_LOGIN.",
  );
}

console.log(`api listening on :${env.API_PORT}`);

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
