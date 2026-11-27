import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";
import path from "path";

const fixtureScript = path.resolve(
  __dirname,
  "../../backend/scripts/e2eRefundFixture.mjs",
);

function runFixture(args: string[]) {
  const out = execFileSync("node", [fixtureScript, ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.trim().split("\n").pop()!);
}

test.describe("Refund Workflow E2E (Self-Contained)", () => {
  let seed: {
    orgId: string;
    branchId: string;
    userId: string;
    email: string;
    password: string;
    customerId: string;
    invoiceId: string;
    invoiceNumber: string;
    paymentId: string;
  };

  test.beforeAll(() => {
    seed = runFixture(["--seed"]);
  });

  test.afterAll(() => {
    if (seed?.orgId) {
      runFixture(["--cleanup", seed.orgId]);
    }
  });

  test("authenticates, opens seeded paid invoice, previews and confirms partial refund, and verifies DB state", async ({
    page,
  }) => {
    test.setTimeout(120000);

    // 1. Authenticate as isolated test user
    await page.goto("/login");
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', seed.email);
    await page.fill('input[type="password"]', seed.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 35000 });

    // 2. Navigate to /billing and open the seeded invoice
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");

    const invoiceRow = page
      .locator("tr", { hasText: seed.invoiceNumber })
      .first();
    await expect(invoiceRow).toBeVisible({ timeout: 20000 });
    await invoiceRow
      .getByRole("button", { name: "View Invoice Details" })
      .click();
    await page.waitForURL(new RegExp(`/billing/${seed.invoiceId}`), {
      timeout: 20000,
    });

    // 3. Open Refund dialog
    page.on("response", async (res) => {
      if (res.url().includes("refund-context")) {
        console.log(
          "REFUND_CONTEXT_STATUS:",
          res.status(),
          await res.text().catch(() => ""),
        );
      }
    });
    const refundButton = page
      .getByRole("button", { name: /^refund$/i })
      .first();
    await expect(refundButton).toBeVisible({ timeout: 15000 });
    await refundButton.click();
    await expect(page.getByText("Financial-only")).toBeVisible({
      timeout: 10000,
    });

    // 4. Fill partial financial-only refund (₹100.00 = 10000 paise) and reason
    const amountInput = page.locator('input[type="number"]').first();
    await expect(amountInput).toBeVisible({ timeout: 10000 });
    await amountInput.fill("100");

    const reasonInput = page.getByPlaceholder("Reason for refund");
    await expect(reasonInput).toBeVisible({ timeout: 10000 });
    await reasonInput.fill("E2E partial refund verification");

    // 5. Preview Refund
    const previewBtn = page.getByRole("button", { name: "Preview Refund" });
    await expect(previewBtn).toBeEnabled({ timeout: 10000 });
    await previewBtn.click();
    await expect(page.getByText("Refund Preview")).toBeVisible({
      timeout: 15000,
    });

    // 6. Confirm Refund
    const confirmBtn = page.getByRole("button", { name: /confirm/i }).first();
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    // 7. Verify refund appears in UI and persists after reload
    await expect(page.getByText(/REF-/i).first()).toBeVisible({
      timeout: 20000,
    });
    await page.reload({ waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: /^refund$/i })
      .first()
      .click();
    await expect(page.getByText(/REF-/i).first()).toBeVisible({
      timeout: 20000,
    });

    // 8. Verify persisted RefundCase, negative completed refund Payment, and unchanged original Invoice/Payment
    const dbState = runFixture(["--verify", seed.invoiceId]);
    expect(dbState.refundCases).toHaveLength(1);
    expect(dbState.refundCases[0].settledAmountPaise).toBe(10000);
    expect(dbState.refundCases[0].paymentSettlementStatus).toBe("settled");

    expect(dbState.refundPayments).toHaveLength(1);
    expect(dbState.refundPayments[0].status).toBe("completed");
    expect(dbState.refundPayments[0].amount).toBe(-100);

    expect(dbState.invoice.status).toBe("finalized");
    expect(dbState.invoice.payableAmount).toBe(1000);
    expect(dbState.originalPayments).toHaveLength(1);
    expect(dbState.originalPayments[0].amount).toBe(1000);
  });
});
