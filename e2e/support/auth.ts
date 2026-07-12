import type { APIRequestContext } from "@playwright/test";

export const studentAuthFile = "playwright/.auth/student.json";
export const adminAuthFile = "playwright/.auth/admin.json";
export const mutableStudentAuthFile = "playwright/.auth/mutable-student.json";

export const e2eAccounts = {
  student: {
    email: "e2e-student@gojo.local",
    nickname: "E2E Student",
    role: "student",
  },
  admin: {
    email: "e2e-admin@gojo.local",
    nickname: "E2E Admin",
    role: "admin",
  },
  mutableStudent: {
    email: "e2e-mutable-student@gojo.local",
    nickname: "E2E Mutable Student",
    role: "student",
  },
} as const;

export async function authenticate(
  request: APIRequestContext,
  account: (typeof e2eAccounts)[keyof typeof e2eAccounts],
  statePath: string,
) {
  const response = await request.post("/dev-auth/dev-login", { data: account });
  if (!response.ok()) {
    throw new Error(
      `Could not provision ${account.role}: ${response.status()} ${await response.text()}`,
    );
  }
  await request.storageState({ path: statePath });
}
