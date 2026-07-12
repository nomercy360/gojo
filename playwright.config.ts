import { defineConfig, devices } from "@playwright/test";

const webURL = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";
const manageServers = !process.env.E2E_EXTERNAL_SERVERS;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: webURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { baseURL: apiURL },
    },
    {
      name: "chromium",
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: manageServers
    ? [
        {
          name: "api",
          command: "bun run dev:api",
          url: `${apiURL}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stderr: "pipe",
        },
        {
          name: "web",
          command: "bun run dev:web",
          url: webURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stderr: "pipe",
        },
      ]
    : undefined,
});
