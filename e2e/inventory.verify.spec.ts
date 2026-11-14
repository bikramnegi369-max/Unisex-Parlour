import { test, expect } from "@playwright/test";

test.describe("Inventory MVP Full Browser Verification", () => {
  test("authenticates, performs inventory actions, and verifies browser UI flows", async ({
    page,
  }) => {
    test.setTimeout(90000);

    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      } else {
        consoleLogs.push(msg.text());
      }
    });

    const email = process.env.E2E_ADMIN_EMAIL || "owner@parlour.com";
    const password = process.env.E2E_ADMIN_PASSWORD || "Admin@1234";

    // 1. Browser Test Login
    await page.goto("/login");
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 35000 });

    // 2. Navigate to Inventory
    await page.goto("/inventory");
    await page.waitForSelector("h1");
    const heading = await page.textContent("h1");
    expect(heading).toContain("Inventory");

    // Select a specific branch if 'All Branches' is active (Adjustment and Consumption require a specific branch)
    const branchBtn = page.locator('button[aria-haspopup="listbox"]');
    if (await branchBtn.isVisible()) {
      const btnText = await branchBtn.textContent();
      if (btnText?.includes("All Branches")) {
        await branchBtn.click();
        await page.waitForSelector('div[role="listbox"] button[role="option"]');
        const options = page.locator(
          'div[role="listbox"] button[role="option"]',
        );
        const count = await options.count();
        if (count > 1) {
          // Click the first specific branch option
          await options.nth(1).click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Check tabs
    const branchStockTab = page.locator('button:has-text("Branch Stock")');
    const catalogueTab = page.locator('button:has-text("Product Catalogue")');
    const movementsTab = page.locator('button:has-text("Movement Ledger")');

    await expect(branchStockTab).toBeVisible();
    await expect(catalogueTab).toBeVisible();
    await expect(movementsTab).toBeVisible();

    // 3. Product Catalogue & Product Creation
    await catalogueTab.click();
    await page.waitForTimeout(1000);

    const addProductBtn = page
      .locator('button:has-text("Add Product")')
      .first();
    await expect(addProductBtn).toBeVisible();
    await addProductBtn.click();

    // Fill Product modal
    const uniqueSku = `SKU-VERIFY-${Date.now().toString().slice(-6)}`;
    await page.waitForSelector('input[name="name"]');
    await page.fill(
      'input[name="name"]',
      `Automated Verify Shampoo ${uniqueSku}`,
    );
    await page.fill('input[name="sku"]', uniqueSku);
    await page.fill('input[name="category"]', "Hair Care");
    await page.selectOption('select[name="usageType"]', "salon_consumption");
    await page.selectOption('select[name="stockUnit"]', "bottle");
    await page.fill('input[name="costPrice"]', "450");
    await page.fill('input[name="reorderLevel"]', "10");

    // Submit modal
    await page.click('button[type="submit"]:has-text("Create Product")');
    await page.waitForTimeout(2000);

    // Verify product shows up in table (specific cell)
    await expect(
      page.locator(`td:has-text("${uniqueSku}")`).first(),
    ).toBeVisible();

    // 4. Create Retail-Only Product for Rejection Test
    await addProductBtn.click();
    const retailSku = `SKU-RETAIL-${Date.now().toString().slice(-6)}`;
    await page.waitForSelector('input[name="name"]');
    await page.fill('input[name="name"]', `Retail Only Serum ${retailSku}`);
    await page.fill('input[name="sku"]', retailSku);
    await page.fill('input[name="category"]', "Retail Serums");
    await page.selectOption('select[name="usageType"]', "retail_sale");
    await page.selectOption('select[name="stockUnit"]', "bottle");
    await page.fill('input[name="costPrice"]', "600");
    await page.fill('input[name="sellingPrice"]', "1200");
    await page.fill('input[name="reorderLevel"]', "5");
    await page.click('button[type="submit"]:has-text("Create Product")');
    await page.waitForTimeout(2000);
    await expect(
      page.locator(`td:has-text("${retailSku}")`).first(),
    ).toBeVisible();

    // 5. Stock Adjustment (Initial Inwards)
    const adjustBtn = page.locator('button:has-text("Adjust")').first();
    await adjustBtn.click();
    await page.waitForSelector('select[name="productId"]');
    // Select option containing SKU
    const adjustOptions = await page.$$eval(
      'select[name="productId"] option',
      (opts) =>
        opts.map((o) => ({
          value: (o as HTMLOptionElement).value,
          text: o.textContent || "",
        })),
    );
    const matchingAdjustOpt = adjustOptions.find((o) =>
      o.text.includes(uniqueSku),
    );
    expect(matchingAdjustOpt).toBeDefined();
    await page.selectOption(
      'select[name="productId"]',
      matchingAdjustOpt!.value,
    );
    await page.fill('input[name="quantityDelta"]', "50");
    await page.selectOption(
      'select[name="reason"]',
      "Physical Stock Audit Reconciliation",
    );
    await page.click('button[type="submit"]:has-text("Commit Adjustment")');
    await page.waitForTimeout(2500);

    // 6. Branch Stock Tab Verification
    await branchStockTab.click();
    await page.waitForTimeout(1500);
    await expect(
      page.locator(`td:has-text("${uniqueSku}")`).first(),
    ).toBeVisible();
    await expect(page.locator("td:has-text('50')").first()).toBeVisible();

    // 7. Manual Salon Consumption
    const consumeBtn = page
      .locator('button:has-text("Log Consumption")')
      .first();
    await consumeBtn.click();
    await page.waitForSelector('select[name="productId"]');

    // 8. Retail-Only Product Rejection Verification
    // Confirm retail product is NOT an option in salon consumption dropdown
    const selectOptions = await page.$$eval(
      'select[name="productId"] option',
      (opts) =>
        opts.map((o) => ({
          value: (o as HTMLOptionElement).value,
          text: o.textContent || "",
        })),
    );
    const containsRetail = selectOptions.some((o) =>
      o.text.includes(retailSku),
    );
    expect(containsRetail).toBe(false);

    // Consume 5 bottles of the salon consumable
    const matchingConsumeOpt = selectOptions.find((o) =>
      o.text.includes(uniqueSku),
    );
    expect(matchingConsumeOpt).toBeDefined();
    await page.selectOption(
      'select[name="productId"]',
      matchingConsumeOpt!.value,
    );
    await page.fill('input[name="quantity"]', "5");
    await page.fill(
      'textarea[name="notes"]',
      "Automated test salon consumption deduction",
    );
    await page.click('button[type="submit"]:has-text("Deduct Stock")');
    await page.waitForTimeout(2500);

    // Balance should now reflect 45
    await expect(page.locator("td:has-text('45')").first()).toBeVisible();

    // 9. Movement Ledger & Reconciliation Tab
    await movementsTab.click();
    await page.waitForTimeout(1500);
    // Should see both adjustment (+50) and consumption (-5)
    await expect(
      page.locator(`td:has-text("${uniqueSku}")`).first(),
    ).toBeVisible();
    await expect(page.locator("td:has-text('+50')").first()).toBeVisible();
    await expect(page.locator("td:has-text('-5')").first()).toBeVisible();

    // 10. Inter-Branch Transfer UI
    const transferBtn = page.locator('button:has-text("Transfer")').first();
    if (await transferBtn.isVisible()) {
      await transferBtn.click();
      await page.waitForSelector('select[name="fromBranchId"]');
      const fromBranchSelect = page.locator('select[name="fromBranchId"]');
      const toBranchSelect = page.locator('select[name="toBranchId"]');
      await expect(fromBranchSelect).toBeVisible();
      await expect(toBranchSelect).toBeVisible();
      // Close transfer modal
      await page.keyboard.press("Escape");
    }

    // Verify no fatal console errors
    const fatalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("hydration"),
    );
    console.log("Captured console errors:", fatalErrors);
    expect(fatalErrors.length).toBe(0);
  });
});
