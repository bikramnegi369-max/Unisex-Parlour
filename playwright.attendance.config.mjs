import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAttendanceE2EConfig } from "../backend/src/e2e/attendanceE2EConfig.js";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(frontendRoot, "..", "backend");
dotenv.config({ path: path.join(backendRoot, ".env.attendance-e2e"), override: true });

const e2e = validateAttendanceE2EConfig();
if (e2e.frontendUrl !== "http://localhost:3000") {
  throw new Error("Attendance E2E frontend must use http://localhost:3000, the origin allowed by the application.");
}

const backendServer = path.join(backendRoot, "scripts", "attendance-e2e-server.mjs");
const withoutSecrets = {
  ATTENDANCE_E2E_MONGO_URI: undefined,
  ATTENDANCE_E2E_ALLOWED_MONGO_HOSTS: undefined,
  ATTENDANCE_E2E_AUTHORIZED_EMAIL: undefined,
  ATTENDANCE_E2E_AUTHORIZED_PASSWORD: undefined,
  ATTENDANCE_E2E_RESTRICTED_EMAIL: undefined,
  ATTENDANCE_E2E_RESTRICTED_PASSWORD: undefined,
  MONGO_URI: undefined,
  MONGO_URL: undefined,
  MONGODB_URI: undefined,
  TEST_MONGO_URI: undefined,
  DATABASE_URL: undefined,
};
const frontendApiUrl = `${e2e.backendOrigin}/api/v1`;

export default defineConfig({
  testDir: "./e2e/attendance",
  testMatch: "**/*.spec.mjs",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  outputDir: "./test-results/attendance-e2e",
  globalSetup: path.join(frontendRoot, "e2e", "attendance", "global-setup.mjs"),
  globalTeardown: path.join(frontendRoot, "e2e", "attendance", "global-teardown.mjs"),
  use: {
    baseURL: e2e.frontendUrl,
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: `"${process.execPath}" "${backendServer}"`,
      url: `${e2e.backendOrigin}/attendance-e2e-health`,
      cwd: backendRoot,
      timeout: 120_000,
      reuseExistingServer: false,
      env: withoutSecrets,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${e2e.frontendPort}`,
      url: e2e.frontendUrl,
      cwd: frontendRoot,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...withoutSecrets,
        NEXT_PUBLIC_API_BASE_URL: frontendApiUrl,
      },
    },
  ],
});
