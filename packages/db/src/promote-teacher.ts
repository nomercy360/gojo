import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user as userTable } from "./schema/index.ts";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: bun run promote-teacher <email>");
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo";
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { casing: "snake_case" });

try {
  const [updated] = await db
    .update(userTable)
    .set({ role: "teacher", updatedAt: new Date() })
    .where(eq(userTable.email, email))
    .returning({
      id: userTable.id,
      email: userTable.email,
      role: userTable.role,
    });

  if (!updated) {
    console.error(`No user found for email: ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`Promoted ${updated.email} to ${updated.role}`);
  }
} finally {
  await client.end();
}
