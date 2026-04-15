import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo",
  },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
