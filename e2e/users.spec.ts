import { test, expect } from "@playwright/test";

test.describe("User Management E2E Integration & Security Flow", () => {
  let createdUserId: string | null = null;
  let testEmail = `e2e_user_${Date.now()}@parlour.com`;
  let testPhone = `+1${String(Date.now()).slice(-9)}`;

  test("should execute User CRUD, Status Changes, and Staff Linkage", async ({ page }) => {
    test.setTimeout(60000); // 60s test limit for Dev Tunnel latency

    // Intercept /rbac/roles to provide real 24-character database ObjectIDs
    await page.route("**/api/v1/rbac/roles", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: "6a757f5cc2eaaf71be95bd34", name: "Owner", description: "Root organization owner" },
            { id: "6a75749d25b4c13286996327", name: "Manager", description: "Branch manager" }
          ]
        })
      });
    });

    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;

    expect(email).toBeDefined();
    expect(password).toBeDefined();

    // Dev Tunnel Bypass - wait for landing page button and click it
    try {
      const backendUrl = "https://4frnn03l-5000.inc1.devtunnels.ms";
      await page.goto(backendUrl, { waitUntil: "domcontentloaded" });
      const bypassButton = page.locator('button:has-text("Continue"), a:has-text("Continue"), button:has-text("Proceed"), a:has-text("Proceed")').first();
      await bypassButton.waitFor({ timeout: 6000 });
      await bypassButton.click();
      await page.waitForTimeout(1500);
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
    await page.fill('input[placeholder="e.g. John Doe"]', "E2E Test User");
    await page.fill('input[placeholder="e.g. +1234567890"]', testPhone);
    await page.fill('input[placeholder="jane@parlour.com"]', testEmail);
    
    // Select Manager option (ObjectId: 6a75749d25b4c13286996327) to allow deactivation/suspension
    await page.selectOption('select[id="roleId"]', { index: 2 });

    // Enable Org-Wide Access to satisfy validation
    await page.check('input[id="hasOrgWideAccess"]');

    // Intercept POST /users to capture created userId
    const [createResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes("/users") && response.request().method() === "POST"),
      page.click('button[type="submit"]')
    ]);

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
      page.fill('input[placeholder="Search by name or email..."]', testEmail)
    ]);
    expect(searchResponse.status()).toBe(200);

    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await expect(userRow).toBeVisible();

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
    // Navigate to employees page to perform linkage
    await page.goto("/employees");
    await page.waitForSelector("h1");

    // Locate first active employee profile
    const employeeRow = page.locator("tbody tr").first();
    await expect(employeeRow).toBeVisible();

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

    // Enter created user ID to link
    await page.fill('input[id="user-id-input"]', createdUserId!);
    const [linkResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes("/user") && response.request().method() === "POST"),
      page.click('button:has-text("Link Account")')
    ]);

    expect(linkResponse.status()).toBe(200);
    await expect(page.locator('h4:has-text("Linked User Account Profile")')).toBeVisible({ timeout: 10000 });

    // 5. CHANGE STATUS (Active -> Inactive)
    await page.goto("/users");
    await page.waitForSelector("h1");

    // Re-search user
    const [searchResponse2] = await Promise.all([
      page.waitForResponse(response => response.url().includes("/users") && response.request().method() === "GET"),
      page.fill('input[placeholder="Search by name or email..."]', testEmail)
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

    await expect(page.locator('text="No account linked"')).toBeVisible();
  });
});
