import { createDb } from "@gojo/db";
import { account, session, user, verification } from "@gojo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "./env.ts";
import { sendEmail } from "./mailer.ts";

const db = createDb(env.DATABASE_URL);

export const auth = betterAuth({
  secret: env.JWT_SECRET,
  baseURL: env.API_ORIGIN,
  basePath: "/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    // Not enforced (requireEmailVerification unset) — sign-in isn't blocked
    // on verification yet. Turn on once deliverability with the chosen SMTP
    // provider is confirmed; blocking on an unverified new domain risks
    // locking real signups out if mail lands in spam or bounces.
    // Best-effort — an SMTP hiccup (or SMTP not configured yet) must not
    // break the reset-password request itself.
    //
    // This same flow doubles as account activation for admin-provisioned
    // accounts (see POST /admin/students): those are created with
    // emailVerified: false and a throwaway password, so the very first
    // "reset" a fresh account gets is really "set your first password" —
    // branch the copy on that instead of building a second token/email path.
    sendResetPassword: async ({ user, url }) => {
      const isFirstActivation = !user.emailVerified;
      try {
        await sendEmail(
          user.email,
          isFirstActivation
            ? "Активируй аккаунт — Gojo Learn"
            : "Восстановление пароля — Gojo Learn",
          isFirstActivation
            ? `<p>Привет${user.name ? `, ${user.name}` : ""}!</p>
               <p>Для тебя создан аккаунт в Gojo Learn. Установи пароль, чтобы войти:</p>
               <p><a href="${url}">Установить пароль</a></p>
               <p>Если ты не ожидал(а) это письмо — просто проигнорируй его.</p>`
            : `<p>Привет${user.name ? `, ${user.name}` : ""}!</p>
               <p>Кто-то (надеемся, ты) запросил сброс пароля для аккаунта Gojo Learn.</p>
               <p><a href="${url}">Сбросить пароль</a></p>
               <p>Если это был не ты — просто проигнорируй это письмо.</p>`,
        );
      } catch (err) {
        console.error("sendResetPassword email failed:", err);
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // Best-effort — same reasoning: a mail failure must not break sign-up
    // itself, since sign-in isn't gated on verification (yet).
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendEmail(
          user.email,
          "Подтверди почту — Gojo Learn",
          `<p>Привет${user.name ? `, ${user.name}` : ""}!</p>
           <p>Спасибо за регистрацию в Gojo Learn. Подтверди свою почту:</p>
           <p><a href="${url}">Подтвердить почту</a></p>
           <p>Если ты не регистрировался — просто проигнорируй это письмо.</p>`,
        );
      } catch (err) {
        console.error("sendVerificationEmail failed:", err);
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "student",
        input: true,
      },
      nickname: {
        type: "string",
        required: false,
        input: true,
      },
      jlptLevel: {
        type: "string",
        required: false,
        input: false,
      },
      quizLevel: {
        type: "string",
        required: false,
        input: false,
      },
      currentLevel: {
        type: "number",
        required: false,
        input: false,
      },
      telegramId: {
        type: "number",
        required: false,
        input: false,
      },
    },
  },
  trustedOrigins: [
    ...(env.TRUSTED_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
    ...(env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : []),
  ],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    },
  },
});

export type Auth = typeof auth;
