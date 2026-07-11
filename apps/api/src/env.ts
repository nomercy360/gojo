import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().default(3001),
  API_ORIGIN: z.string().url().default("http://localhost:3001"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  TRUSTED_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().min(16).default("dev-secret-change-me-in-production-please"),
  ALLOW_DEV_LOGIN: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  // Optional: chat id to ping on new landing leads. If unset, leads are still
  // saved to the DB — the Telegram notification is just skipped.
  TELEGRAM_LEAD_CHAT_ID: z.string().optional(),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_PUBLIC_URL: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET: z.string().default("gojo-dev"),
  // Transactional email (verification, password reset). Defaults target the
  // local Mailpit dev catcher (infra/docker-compose.yml, SMTP on :1025, no
  // auth needed). In prod, point these at a real SMTP provider.
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Gojo Learn <no-reply@gojolearn.ru>"),
  // Error monitoring. Unset = Sentry.init() no-ops (documented behavior),
  // so this is safe to ship before a Sentry project/DSN exists.
  SENTRY_DSN: z.string().optional(),
  YOOKASSA_SHOP_ID: z.string().optional(),
  YOOKASSA_SECRET_KEY: z.string().optional(),
  // Claude first-pass homework review. Unset = submissions stay in
  // "submitted" and the teacher reviews raw text without AI markup.
  ANTHROPIC_API_KEY: z.string().optional(),
  // Resend transactional email. When set, mail goes through the Resend HTTP
  // API (port 443) instead of SMTP — prod SMTP ports are blocked on the VM.
  // Unset (dev) falls back to SMTP/Mailpit. Sender domain must be verified
  // in Resend and match SMTP_FROM.
  RESEND_API_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
