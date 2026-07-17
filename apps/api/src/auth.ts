import { createDb } from "@gojo/db";
import { account, leads, session, user, verification } from "@gojo/db";
import { and } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { env } from "./env.ts";
import { sendEmail } from "./mailer.ts";

const db = createDb(env.DATABASE_URL);

// When a combined login flow (code + link in ONE message) needs the magic-link
// URL instead of the default standalone email, it registers a capture here
// before calling signInMagicLink; sendMagicLink hands the URL over and skips
// its own send. Keyed by lowercased email; in-process is fine — the API is a
// single container and signInMagicLink awaits sendMagicLink synchronously.
const magicLinkCaptures = new Map<string, (url: string) => void>();

export async function issueMagicLinkUrl(opts: {
  email: string;
  name?: string;
  callbackURL: string;
  headers: Headers;
}): Promise<string | null> {
  const key = opts.email.toLowerCase();
  let captured: string | null = null;
  magicLinkCaptures.set(key, (url) => {
    captured = url;
  });
  try {
    await auth.api.signInMagicLink({
      body: { email: key, name: opts.name, callbackURL: opts.callbackURL },
      headers: opts.headers,
    });
  } finally {
    magicLinkCaptures.delete(key);
  }
  return captured;
}

export const auth = betterAuth({
  secret: env.JWT_SECRET,
  baseURL: env.API_ORIGIN,
  basePath: "/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    session: {
      create: {
        // Runs for every login path — better-auth magic link AND our custom
        // OTP/Telegram logins (createSessionCookie goes through the same
        // internal adapter). "Has the client ever entered?" = lastLoginAt.
        after: async (session) => {
          await db
            .update(user)
            .set({ lastLoginAt: new Date(), updatedAt: new Date() })
            .where(eq(user.id, session.userId))
            .catch((err) => console.error("lastLoginAt update failed:", err));
          // The lead lifecycle's last transition: a lead whose login link was
          // sent counts as converted the moment the client actually enters.
          await db
            .update(leads)
            .set({ status: "converted", updatedAt: new Date() })
            .where(and(eq(leads.studentId, session.userId), eq(leads.status, "link_sent")))
            .catch((err) => console.error("lead conversion flip failed:", err));
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "student", input: true },
      nickname: { type: "string", required: false, input: true },
      jlptLevel: { type: "string", required: false, input: false },
      quizLevel: { type: "string", required: false, input: false },
      currentLevel: { type: "number", required: false, input: false },
      telegramId: { type: "number", required: false, input: false },
      telegramUsername: { type: "string", required: false, input: false },
    },
  },
  trustedOrigins: [
    ...(env.TRUSTED_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
    ...(env.NODE_ENV === "development" ? ["http://localhost:3000", "http://127.0.0.1:3000"] : []),
  ],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    },
  },
  plugins: [
    // Passwordless email magic link. The link better-auth
    // builds (`url`) is baseURL-derived and reachable through the same /auth/*
    // Caddy route, so — unlike the old verify/reset emails — it needs no manual
    // /api rewrite.
    magicLink({
      // A magic link is sign-in/invitation only. POST /teacher/students creates
      // the account before requesting its first link.
      disableSignUp: true,
      // Match the login-code TTL (and the "10 минут" copy in every message).
      expiresIn: 600,
      sendMagicLink: async ({ email, url, metadata }) => {
        const capture = magicLinkCaptures.get(email.toLowerCase());
        if (capture) {
          // The caller already resolved and authorized the account; it will
          // deliver the URL inside its own combined message.
          capture(url);
          return;
        }
        const [existing] = await db
          .select({ role: user.role })
          .from(user)
          .where(eq(user.email, email.toLowerCase()))
          .limit(1);
        const expectedRole = metadata?.expectedRole;

        // Keep the public response generic while declining to email unknown
        // users or a user who tried the wrong role-specific login page.
        if (
          !existing ||
          (expectedRole === "admin" || expectedRole === "student"
            ? existing.role !== expectedRole
            : false)
        ) {
          return;
        }
        try {
          await sendEmail(
            email,
            "Вход в Gojo Learn",
            `<p>Привет!</p>
             <p>Нажми, чтобы войти в Gojo Learn:</p>
             <p><a href="${url}">Войти</a></p>
             <p>Ссылка одноразовая и скоро истечёт. Если это был не ты — просто проигнорируй письмо.</p>`,
          );
        } catch (err) {
          console.error("sendMagicLink email failed:", err);
        }
      },
    }),
  ],
});

export type Auth = typeof auth;
