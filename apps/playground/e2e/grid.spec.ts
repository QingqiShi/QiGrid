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
  await expect(page.locator(".vgrid-row")).toHaveCount(
    await page.locator(".vgrid-row").count(),
    { timeout: 5000 },
  );

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
