import { expect, test } from "@playwright/test";

test.describe("visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    // Wait for the grid to be fully rendered
    await expect(page.locator("tbody tr")).toHaveCount(100);
  });

  test("full page", async ({ page }) => {
    await expect(page).toHaveScreenshot("full-page.png");
  });

  test("grid container", async ({ page }) => {
    const grid = page.locator(".grid-container");
    await expect(grid).toHaveScreenshot("grid-container.png");
  });

  test("grid header", async ({ page }) => {
    const header = page.locator(".grid-table thead");
    await expect(header).toHaveScreenshot("grid-header.png");
  });
});
