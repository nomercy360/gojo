import { expect, test } from "@playwright/test";
import { adminAuthFile, mutableStudentAuthFile } from "./support/auth";
import { cleanLearningFlow } from "./support/data";

const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

async function createLesson(admin: import("@playwright/test").APIRequestContext) {
  const startsAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const response = await admin.post(`${apiURL}/teacher/lessons`, {
    data: {
      title: `E2E protected materials ${Date.now()}`,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
    },
  });
  await expect(response).toBeOK();
  return ((await response.json()) as { id: string }).id;
}

test("lesson materials reject guests", async ({ playwright }) => {
  const admin = await playwright.request.newContext({ storageState: adminAuthFile });
  const guest = await playwright.request.newContext();
  let lessonId: string | undefined;
  try {
    lessonId = await createLesson(admin);
    const response = await guest.get(`${apiURL}/lessons/${lessonId}/materials`);
    expect(response.status()).toBe(401);
  } finally {
    await cleanLearningFlow(lessonId, undefined);
    await Promise.all([admin.dispose(), guest.dispose()]);
  }
});

test("lesson materials reject an unbooked student", async ({ playwright }) => {
  const admin = await playwright.request.newContext({ storageState: adminAuthFile });
  const student = await playwright.request.newContext({ storageState: mutableStudentAuthFile });
  let lessonId: string | undefined;
  try {
    lessonId = await createLesson(admin);
    const response = await student.get(`${apiURL}/lessons/${lessonId}/materials`);
    expect(response.status()).toBe(403);
  } finally {
    await cleanLearningFlow(lessonId, undefined);
    await Promise.all([admin.dispose(), student.dispose()]);
  }
});
