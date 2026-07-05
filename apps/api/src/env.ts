import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  API_PORT: z.coerce.number().default(3001),
  API_ORIGIN: z.string().url().default("http://localhost:3001"),
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
  LIVEKIT_URL: z.string().default("ws://localhost:7880"),
  LIVEKIT_API_KEY: z.string().default("devkey"),
  LIVEKIT_API_SECRET: z.string().default("devsecret123456789012345678901234"),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  // Internal-network URL for the egress service to reach S3/Minio. In dev
  // egress runs in docker and needs `http://minio:9000`; prod may reuse the
  // public R2 URL.
  S3_INTERNAL_ENDPOINT: z.string().optional(),
  S3_PUBLIC_URL: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET: z.string().default("gojo-dev"),
  RECORDING_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  // Transactional email (verification, password reset). Defaults target the
  // local Mailpit dev catcher (infra/docker-compose.yml, SMTP on :1025, no
  // auth needed). In prod, point these at a real SMTP provider.
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Gojo Learn <no-reply@gojolearn.ru>"),
});

export const env = schema.parse(process.env);
