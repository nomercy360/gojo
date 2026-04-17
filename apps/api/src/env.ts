import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  API_PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(16).default("dev-secret-change-me-in-production-please"),
  LIVEKIT_URL: z.string().default("ws://localhost:7880"),
  LIVEKIT_API_KEY: z.string().default("devkey"),
  LIVEKIT_API_SECRET: z.string().default("devsecret123456789012345678901234"),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_PUBLIC_URL: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET: z.string().default("gojo-dev"),
});

export const env = schema.parse(process.env);
