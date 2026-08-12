import { test, expect } from "@playwright/test";

test.describe("User Management E2E Integration & Security Flow", () => {
  let createdUserId: string | null = null;
  test("should execute User CRUD, Status Changes, and Staff Linkage", async ({ page }) => {
    test.setTimeout(120000); // 120s test limit for Dev Tunnel latency
    const testEmail = `e2e_user_${Date.now()}_${Math.floor(Math.random() * 1000)}@parlour.com`;
    const testPhone = `+1${String(Date.now()).slice(-7)}${Math.floor(Math.random() * 100)}`;



    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;

    expect(email).toBeDefined();
    expect(password).toBeDefined();

    // Dev Tunnel Bypass - wait for landing page button and click it
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const backendUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
      if (backendUrl) {
        await page.goto(backendUrl, { waitUntil: "domcontentloaded" });
        const bypassButton = page.locator('button:has-text("Continue"), a:has-text("Continue"), button:has-text("Proceed"), a:has-text("Proceed")').first();
        await bypassButton.waitFor({ timeout: 6000 });
        await bypassButton.click();
        await page.waitForTimeout(1500);
      }
    } catch (err) {
      // Ignored
    }

    // 1. Authenticate Admin
    await page.goto("/login");
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 35000 });

    // Navigate to users
    await page.goto("/users");
    await page.waitForSelector("h1");

    // 2. CREATE USER
    const addButton = page.locator('button:has-text("Add Staff Member")');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Fill registration form
    await page.fill('input[placeholder="e.g. John Doe"]', `E2E Test User ${Date.now()}`);
    await page.fill('input[placeholder="e.g. +1234567890"]', testPhone);
    await page.fill('input[placeholder="jane@parlour.com"]', testEmail);
    
    // Select Manager option dynamically by label/text to allow deactivation/suspension
    const roleSelect = page.locator('select[id="roleId"]');
    const managerOptionValue = await roleSelect.evaluate((select: HTMLSelectElement) => {
      const options = Array.from(select.options);
      const managerOpt = options.find(opt => opt.text.toLowerCase().includes('manager'));
      return managerOpt ? managerOpt.value : '';
    });
    if (managerOptionValue) {
      await roleSelect.selectOption(managerOptionValue);
    } else {
      // Fallback
      await roleSelect.selectOption({ index: 2 });
    }

    // Enable Org-Wide Access to satisfy validation
    await page.check('input[id="hasOrgWideAccess"]');

    // Intercept POST /users to capture created userId
    const [createResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes("/users") && response.request().method() === "POST"),
      page.click('button[type="submit"]')
    ]);

    if (createResponse.status() !== 201) {
      console.error("CREATE USER FAILED:", await createResponse.text());
    }
    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    createdUserId = createBody.data.id;
    expect(createdUserId).toBeDefined();

    // Close dialog if still open
    await expect(page.locator('h2:has-text("Register New Staff Member")')).toHaveCount(0);

    // 3. EDIT USER
    // Search for the user in table
    const [searchResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes("/users") && response.request().method() === "GET"),
      page.fill('input[placeholder="Search staff by name, email, or phone..."]', testEmail)
    ]);
    expect(searchResponse.status()).toBe(200);

    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await expect(userRow).toBeVisible({ timeout: 15000 });

    const editButton = userRow.locator('button[title="Edit Profile"]');
    await editButton.click();

    // Modify name and phone
    await page.fill('input[id="name"]', "E2E Test User Modified");
    
    const uniquePhoneSuffix = String(Date.now()).slice(-9);
    await page.fill('input[id="phone"]', `+1${uniquePhoneSuffix}`);

    // Intercept PATCH /users/:id
    const [editResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes(`/users/${createdUserId}`) && response.request().method() === "PATCH"),
      page.click('button:has-text("Save Changes")')
    ]);

    expect(editResponse.status()).toBe(200);

    // 4. STAFF LINKAGE E2E
    test.setTimeout(120000); // Increase test timeout limit for Dev Tunnel latency

    // Navigate to employees page to perform linkage
    await page.goto("/employees");
    await page.waitForSelector("h1");

    // Locate first active employee profile
    const employeeRow = page.locator("tbody tr").first();
    await expect(employeeRow).toBeVisible({ timeout: 15000 });

    const viewEmployeeButton = employeeRow.locator('button[title="View Details"]');
    await viewEmployeeButton.click();

    // Wait for Employee profile tabs
    await page.waitForSelector('button:has-text("User Account")');
    await page.click('button:has-text("User Account")');

    // Check if user is already linked; if so, unlink first
    const unlinkButton = page.locator('button:has-text("Unlink User Account")');
    if (await unlinkButton.isVisible()) {
      await unlinkButton.click();
      await page.waitForResponse(response => response.url().includes("/user") && response.request().method() === "DELETE");
      await page.waitForTimeout(1000);
    }

    // Search and select created user in UserSelector
    const searchInput = page.locator('input[aria-label="Linked User"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(testEmail);

    // Wait for the drop-down listbox results to appear
    const userOption = page.locator('button[role="option"]', { hasText: testEmail });
    await userOption.waitFor({ timeout: 15000 });
    await userOption.click();

    // Now click Link Account
    const [linkResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes("/user") && response.request().method() === "POST"),
      page.click('button:has-text("Link User Account")')
    ]);

    expect(linkResponse.status()).toBe(200);

    // 5. CHANGE STATUS (Active -> Inactive)
    await page.goto("/users");
    await page.waitForSelector("h1");

    // Re-search user
    const [searchResponse2] = await Promise.all([
      page.waitForResponse(response => response.url().includes("/users") && response.request().method() === "GET"),
      page.fill('input[placeholder="Search staff by name, email, or phone..."]', testEmail)
    ]);
    expect(searchResponse2.status()).toBe(200);

    const userRowForStatus = page.locator(`tr:has-text("${testEmail}")`);
    await expect(userRowForStatus).toBeVisible();

    const deactivateButton = userRowForStatus.locator('button[title="Deactivate"]');
    await deactivateButton.click();

    // Confirm dialog
    const [statusResponse1] = await Promise.all([
      page.waitForResponse(response => response.url().includes(`/users/${createdUserId}/status`) && response.request().method() === "PATCH"),
      page.click('button:has-text("Deactivate Account")')
    ]);

    expect(statusResponse1.status()).toBe(200);

    // 6. CHANGE STATUS (Inactive -> Active / Reactivate)
    const reactivateButton = userRowForStatus.locator('button[title="Reactivate"]');
    await reactivateButton.click();

    // Confirm dialog
    const [statusResponse2] = await Promise.all([
      page.waitForResponse(response => response.url().includes(`/users/${createdUserId}/status`) && response.request().method() === "PATCH"),
      page.click('button:has-text("Activate Account")')
    ]);

    expect(statusResponse2.status()).toBe(200);

    // 7. STAFF UNLINKAGE E2E
    await page.goto("/employees");
    await page.waitForSelector("h1");
    await viewEmployeeButton.click();
    await page.click('button:has-text("User Account")');

    const finalUnlinkButton = page.locator('button:has-text("Unlink User Account")');
    await expect(finalUnlinkButton).toBeVisible();
    await finalUnlinkButton.click();
    await page.waitForResponse(response => response.url().includes("/user") && response.request().method() === "DELETE");

    await expect(page.locator('text="No Login Account Linked"')).toBeVisible();
  });
});
