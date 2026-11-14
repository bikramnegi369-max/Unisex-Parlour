import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAttendanceE2EConfig } from "../../../backend/src/e2e/attendanceE2EConfig.js";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.resolve(frontendRoot, "..", "backend", ".env.attendance-e2e"), override: true });
const e2e = validateAttendanceE2EConfig();
const branchA = `Attendance E2E ${e2e.runId} Branch A`;
const branchB = `Attendance E2E ${e2e.runId} Branch B`;
const alphaName = `E2E Alpha ${e2e.runId}`;
const missingName = `E2E Missing ${e2e.runId}`;
const betaName = `E2E Beta ${e2e.runId}`;

test.beforeEach(async ({ request }) => {
  const response = await request.get(`${e2e.backendOrigin}/attendance-e2e-health`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    success: true,
    mode: "attendance-e2e",
    database: "saloon_erp_attendance_e2e",
    clusterHosts: e2e.uriHosts,
  });
});

async function login(page, email, password) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("name@example.com").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function selectBranch(page, name) {
  await page.locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole("option", { name }).click();
}

async function openAttendance(page) {
  await page.goto("/attendance");
  await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
}

test("authorized user completes register, detail, adjustment, reconciliation, branch and responsive journeys", async ({ page }) => {
  await login(page, e2e.authorizedEmail, e2e.authorizedPassword);
  await selectBranch(page, branchA);
  await openAttendance(page);

  const dateInput = page.locator('input[type="date"]');
  const selectedDate = await dateInput.inputValue();
  const priorDate = new Date(`${selectedDate}T00:00:00.000Z`);
  priorDate.setUTCDate(priorDate.getUTCDate() - 1);
  await dateInput.fill(priorDate.toISOString().slice(0, 10));
  await expect(dateInput).toHaveValue(priorDate.toISOString().slice(0, 10));
  await dateInput.fill(selectedDate);

  await expect(page.getByText(alphaName)).toBeVisible();
  await page.getByPlaceholder("Search staff").fill("E2E Alpha");
  await expect(page.getByText(alphaName)).toBeVisible();
  await page.getByLabel("Filter by attendance status").selectOption("incomplete");
  await expect(page.getByText(alphaName)).toBeVisible();
  await page.getByLabel("Filter by attendance status").selectOption("all");
  await page.getByPlaceholder("Search staff").fill("");
  await page.getByRole("button", { name: new RegExp(alphaName) }).click();

  await expect(page.getByText("Punch history")).toBeVisible();
  await expect(page.getByText("in · simulator")).toBeVisible();
  await expect(page.getByText(/Approved leave ·/)).toBeVisible();
  const adjustmentReason = `E2E adjustment ${e2e.runId}`;
  const adjustmentInput = page.getByPlaceholder("Explain the evidence and reason for this adjustment");
  const saveAdjustment = page.getByRole("button", { name: "Save adjustment" });
  await expect(saveAdjustment).toBeDisabled();
  await adjustmentInput.fill(adjustmentReason);
  await saveAdjustment.click();
  await expect(page.getByText(adjustmentReason)).toBeVisible();

  const leaveReason = `E2E leave exception ${e2e.runId}`;
  await page.getByPlaceholder("Required reason for this date-level exception").fill(leaveReason);
  await page.getByRole("button", { name: "Save date exception" }).click();
  await expect(page.getByText("Date exception recorded")).toBeVisible();

  await page.getByRole("tab", { name: "Reconciliation" }).click();
  await expect(page.getByText("Cross-branch attendance conflicts")).toBeVisible();
  await expect(page.getByText(`${branchA} / ${branchB}`, { exact: true })).toBeVisible();
  await expect(page.getByText("E2E-APT-")).toBeVisible();
  const conflictReason = `E2E conflict resolution ${e2e.runId}`;
  await page.getByLabel("Conflict resolution reason").fill(conflictReason);
  await page.getByRole("button", { name: "Retain original claim" }).click();
  await expect(page.getByText("No pending cross-branch conflicts.")).toBeVisible();

  const appointmentReason = `E2E appointment retention ${e2e.runId}`;
  await page.getByLabel("Appointment conflict reason").fill(appointmentReason);
  await page.getByRole("button", { name: "Retain appointment" }).click();
  await expect(page.getByText("Retained · resolved")).toBeVisible();

  await page.getByRole("tab", { name: "Daily register" }).click();
  await selectBranch(page, branchB);
  await expect(page.getByText(betaName)).toBeVisible();
  await expect(page.getByText(alphaName)).toHaveCount(0);

  await page.getByRole("tab", { name: "Provider sync" }).click();
  await expect(page.getByText("Provider configuration and sync status")).toBeVisible();
  await expect(page.getByText("No provider configuration exists for this branch.")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(mobileOverflow).toBe(false);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
});

test("missing-punch reconciliation, empty, loading, error and retry states use the backend", async ({ page }) => {
  let delayFirstRegister = true;
  let failingRegister = true;
  await page.route("**/attendance/records**", async (route) => {
    if (delayFirstRegister) {
      delayFirstRegister = false;
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    if (failingRegister) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Controlled E2E register failure" }),
      });
      return;
    }
    await route.continue();
  });

  await login(page, e2e.authorizedEmail, e2e.authorizedPassword);
  await selectBranch(page, branchA);
  await openAttendance(page);
  await expect(page.getByText("Loading branch attendance…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible({ timeout: 15_000 });
  failingRegister = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText(missingName)).toBeVisible();

  await page.getByPlaceholder("Search staff").fill("no matching E2E staff");
  await expect(page.getByText("No staff records")).toBeVisible();
  await page.getByPlaceholder("Search staff").fill("E2E Missing");
  await page.getByRole("button", { name: new RegExp(missingName) }).click();
  await expect(page.getByText("No punch evidence is recorded. This is not a confirmed absence.")).toBeVisible();
  const missingReason = `E2E missing punch ${e2e.runId}`;
  await page.getByPlaceholder("Explain the evidence and reason for this adjustment").fill(missingReason);
  await page.getByRole("button", { name: "Save adjustment" }).click();
  await expect(page.getByText(missingReason)).toBeVisible();

});

test("restricted user is denied the Attendance route and API actions", async ({ page, request }) => {
  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/auth/login") && response.request().method() === "POST",
  );
  await login(page, e2e.restrictedEmail, e2e.restrictedPassword);
  const loginResponse = await loginResponsePromise;
  const responsePayload = await loginResponse.json();
  const accessToken = responsePayload.data?.accessToken || responsePayload.accessToken;
  expect(typeof accessToken).toBe("string");

  await expect(page.getByRole("link", { name: "Attendance" })).toHaveCount(0);
  await page.goto("/attendance");
  await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();

  const manifestPath = path.resolve(frontendRoot, "..", "backend", ".attendance-e2e-fixtures.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  expect(manifest.runId).toBe(e2e.runId);
  const branchId = manifest.branchIds[0];
  const headers = { Authorization: `Bearer ${accessToken}`, "X-Branch-Id": branchId };
  const readResponse = await request.get(`${e2e.backendUrl}/attendance/records?date=${new Date().toISOString().slice(0, 10)}`, { headers });
  expect(readResponse.status()).toBe(403);
  const adjustResponse = await request.post(`${e2e.backendUrl}/attendance/records/adjust`, {
    headers,
    data: {
      staffId: "000000000000000000000001",
      date: new Date().toISOString().slice(0, 10),
      status: "present",
      reason: `E2E restricted attempt ${e2e.runId}`,
    },
  });
  expect(adjustResponse.status()).toBe(403);
});
