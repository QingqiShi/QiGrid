import { expect, test } from "@playwright/test";

test("renders the QiGrid playground", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveText("QiGrid Playground");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Verify the grid has the expected column headers
  const headers = page.locator(".vgrid-header-cell");
  await expect(headers).toHaveCount(9);
  await expect(headers.nth(0)).toContainText("ID");
  await expect(headers.nth(1)).toContainText("First Name");

  // Verify only a small number of rows are rendered (not all 10,000)
  const rows = page.locator(".vgrid-row");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(10);
  expect(rowCount).toBeLessThan(50);
});

test("scroll to middle renders correct rows", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".vgrid-row")).toHaveCount(await page.locator(".vgrid-row").count(), {
    timeout: 5000,
  });

  const scrollContainer = page.locator(".vgrid-body");

  // Scroll to row ~5000 (5000 * 36 = 180000px)
  await scrollContainer.evaluate((el) => {
    el.scrollTop = 180000;
  });

  // Wait for rows near index 5000 to appear
  await expect(page.locator("[data-row-index='5000']")).toBeVisible({ timeout: 5000 });
});

test("scroll to bottom renders last row", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".vgrid-row").first()).toBeVisible();

  const scrollContainer = page.locator(".vgrid-body");

  // Scroll to the very bottom
  await scrollContainer.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  // Row 9999 (0-indexed) should be rendered
  await expect(page.locator("[data-row-index='9999']")).toBeVisible({ timeout: 5000 });
});

test("drag resize handle right increases column width", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  const header = page.locator(".vgrid-header-cell").first();
  const initialWidth = await header.evaluate((el) => el.getBoundingClientRect().width);

  const handle = page.locator("[data-testid='resize-handle-id']");
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("resize handle not visible");

  // Drag 50px to the right
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 50, handleBox.y + handleBox.height / 2);
  await page.mouse.up();

  const newWidth = await header.evaluate((el) => el.getBoundingClientRect().width);
  expect(newWidth).toBeGreaterThanOrEqual(initialWidth + 40); // ~50px, allow some tolerance
});

test("drag resize handle far left clamps to minWidth", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  const handle = page.locator("[data-testid='resize-handle-id']");
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("resize handle not visible");

  // Drag far left (e.g. -500px) to trigger minWidth clamping
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 - 500,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.up();

  const header = page.locator(".vgrid-header-cell").first();
  const clampedWidth = await header.evaluate((el) => el.getBoundingClientRect().width);
  // Default minWidth is 50
  expect(clampedWidth).toBeGreaterThanOrEqual(50);
  expect(clampedWidth).toBeLessThanOrEqual(55); // Should be at or near minWidth
});

test("resize handle shows col-resize cursor on hover", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  const handle = page.locator("[data-testid='resize-handle-id']");
  const cursor = await handle.evaluate((el) => window.getComputedStyle(el).cursor);
  expect(cursor).toBe("col-resize");
});
