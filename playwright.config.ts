import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E runs against a production build (`next start`) with:
 * - a disposable database seeded by `npm run e2e:seed` (synthetic fixtures only),
 * - the test login enabled and a throwaway AUTH_SECRET generated per run,
 * - no OpenAI key, so answers are deterministic (search-only / records-only modes).
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `${baseURL}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      AUTH_SECRET: randomBytes(32).toString("base64"),
      AUTH_TEST_LOGIN: "enabled",
      LEAD_GITHUB_LOGINS: "e2e-lead",
      OPENAI_API_KEY: "",
      OPENAI_CHAT_MODEL: "",
    },
  },
});
