import { createDb } from "@gojo/db";
import { account, session, user, verification } from "@gojo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, magicLink } from "better-auth/plugins";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "./env.ts";
import { sendEmail } from "./mailer.ts";

const db = createDb(env.DATABASE_URL);

// Telegram Login is OIDC but exposes NO userinfo endpoint — user claims live in
// the id_token, verified against Telegram's public JWKS.
const telegramJwks = createRemoteJWKSet(
  new URL("https://oauth.telegram.org/.well-known/jwks.json"),
);

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
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "student", input: true },
      nickname: { type: "string", required: false, input: true },
      jlptLevel: { type: "string", required: false, input: false },
      quizLevel: { type: "string", required: false, input: false },
      currentLevel: { type: "number", required: false, input: false },
      telegramId: { type: "number", required: false, input: false },
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
    // Primary login: Telegram (OIDC). better-auth drives the OAuth dance and the
    // account/session tables; we only supply user claims from the id_token since
    // Telegram has no userinfo endpoint. redirect_uri is baseURL-derived
    // (API_ORIGIN/auth/oauth2/callback/telegram) — reachable through Caddy via a
    // dedicated /auth/* route (see infra/Caddyfile) and registered in BotFather.
    genericOAuth({
      config: [
        {
          providerId: "telegram",
          discoveryUrl: "https://oauth.telegram.org/.well-known/openid-configuration",
          clientId: env.TELEGRAM_LOGIN_CLIENT_ID,
          clientSecret: env.TELEGRAM_LOGIN_CLIENT_SECRET ?? "",
          scopes: ["openid", "profile", "telegram:bot_access"],
          pkce: true,
          authentication: "basic",
          getUserInfo: async (tokens) => {
            const idToken = tokens.idToken;
            if (!idToken) return null;
            const { payload } = await jwtVerify(idToken, telegramJwks, {
              issuer: "https://oauth.telegram.org",
              audience: env.TELEGRAM_LOGIN_CLIENT_ID,
            });
            // The Telegram user id is the numeric `id` claim (from `profile`);
            // `sub` is a large opaque string that overflows MAX_SAFE_INTEGER.
            const id = typeof payload.id === "number" ? payload.id : Number(payload.id);
            if (!Number.isSafeInteger(id) || id <= 0) return null;
            const name =
              typeof payload.name === "string" && payload.name.trim()
                ? payload.name.trim()
                : `tg${id}`;
            return {
              id: String(id),
              // Telegram returns no email. Synthesize a stable, unique
              // placeholder so the NOT NULL/unique email constraint holds; a
              // real email can be attached later for magic-link sign-in.
              email: `${id}@telegram.gojo`,
              emailVerified: true,
              name,
              image: typeof payload.picture === "string" ? payload.picture : undefined,
            };
          },
          // Persist the Telegram numeric id on the user (used by reminders and
          // bot DMs). Merged over the getUserInfo result at account creation.
          // Cast: mapProfileToUser's type exposes only core User fields, but
          // better-auth persists declared additionalFields (telegramId/role)
          // from the merged profile at runtime.
          mapProfileToUser: (profile) =>
            ({ telegramId: Number(profile.id), role: "student" }) as never,
        },
      ],
    }),
    // Secondary login: passwordless email magic link. The link better-auth
    // builds (`url`) is baseURL-derived and reachable through the same /auth/*
    // Caddy route, so — unlike the old verify/reset emails — it needs no manual
    // /api rewrite.
    magicLink({
      sendMagicLink: async ({ email, url }) => {
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
