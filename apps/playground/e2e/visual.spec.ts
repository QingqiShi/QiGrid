import { expect, test } from "@playwright/test";

test.describe("visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    // Wait for the virtual grid to render some rows
    await expect(page.locator(".vgrid-row")).toHaveCount(
      await page.locator(".vgrid-row").count(),
      { timeout: 5000 },
    );
    // Ensure at least some rows are visible
    await expect(page.locator(".vgrid-row").first()).toBeVisible();
  });

  test("full page", async ({ page }) => {
    await expect(page).toHaveScreenshot("full-page.png");
  });

  test("grid container", async ({ page }) => {
    const grid = page.locator(".grid-container");
    await expect(grid).toHaveScreenshot("grid-container.png");
  });

  test("grid header", async ({ page }) => {
    const header = page.locator(".vgrid-header");
    await expect(header).toHaveScreenshot("grid-header.png");
  });
});
