import { createDb } from "@gojo/db";
import { account, session, user, verification } from "@gojo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "./env.ts";

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
