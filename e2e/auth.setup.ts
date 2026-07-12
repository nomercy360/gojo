import { test as setup } from "@playwright/test";
import {
  adminAuthFile,
  authenticate,
  e2eAccounts,
  mutableStudentAuthFile,
  studentAuthFile,
} from "./support/auth";

setup("provision role-specific sessions", async ({ playwright }) => {
  for (const [account, statePath] of [
    [e2eAccounts.student, studentAuthFile],
    [e2eAccounts.admin, adminAuthFile],
    [e2eAccounts.mutableStudent, mutableStudentAuthFile],
  ] as const) {
    const request = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL ?? "http://localhost:3001",
    });
    await authenticate(request, account, statePath);
    await request.dispose();
  }
});
