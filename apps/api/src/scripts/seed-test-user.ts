import { user as userTable } from "@gojo/db";
import { eq } from "drizzle-orm";
import { auth } from "../auth.ts";
import { db } from "../db.ts";
import { env } from "../env.ts";

// Local-only accounts with real Better Auth password hashes. This script is
// run automatically before the development servers start, but is never part
// of migrations or the production entrypoint.
const LOCAL_USERS = [
  {
    email: "admin.test@gojolearn.ru",
    password: "AdminTest123-",
    nickname: "Админ",
    role: "admin",
  },
  {
    email: "student.test@gojolearn.ru",
    password: "StudentTest123-",
    nickname: "Студент",
    role: "student",
  },
] as const;

if (env.NODE_ENV === "production") {
  console.error("Refusing to seed a test account against a production environment.");
  process.exit(1);
}

for (const localUser of LOCAL_USERS) {
  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, localUser.email))
    .limit(1);

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        email: localUser.email,
        password: localUser.password,
        name: localUser.nickname,
        // biome-ignore lint/suspicious/noExplicitAny: Better Auth additional fields are dynamic
        ...({ nickname: localUser.nickname, role: localUser.role } as any),
      },
    });
    console.log(`Created local ${localUser.role}: ${localUser.email}`);
    continue;
  }

  await db
    .update(userTable)
    .set({ nickname: localUser.nickname, name: localUser.nickname, role: localUser.role })
    .where(eq(userTable.id, existing.id));
  console.log(`Local ${localUser.role} already exists: ${localUser.email}`);
}

process.exit(0);
