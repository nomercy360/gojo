import { user as userTable } from "@gojo/db";
import { eq } from "drizzle-orm";
import { auth } from "../auth.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";

// Standalone, manually-invoked helper for a fixed local test login. NOT part
// of packages/db/src/migrate.ts (which runs on every prod deploy) — a
// hardcoded credential must never be reachable from a production pipeline.
// Run with: bun run seed:test-user

const TEST_EMAIL = "test@gojo.local";
const TEST_PASSWORD = "testpass123";
const TEST_NICKNAME = "TestUser";

if (env.NODE_ENV === "production") {
  console.error("Refusing to seed a test account against a production environment.");
  process.exit(1);
}

const [existing] = await db
  .select()
  .from(userTable)
  .where(eq(userTable.email, TEST_EMAIL))
  .limit(1);

if (existing) {
  console.log(`Test account already exists: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  process.exit(0);
}

await auth.api.signUpEmail({
  body: {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    name: TEST_NICKNAME,
    // biome-ignore lint/suspicious/noExplicitAny: additional fields beyond the base schema
    ...({ nickname: TEST_NICKNAME, role: "student" } as any),
  },
});

console.log(`Test account created: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
process.exit(0);
