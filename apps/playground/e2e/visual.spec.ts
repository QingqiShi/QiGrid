import { expect, test } from "@playwright/test";

test.describe("visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    // Wait for the virtual grid to render some rows
    await expect(page.locator(".vgrid-row")).toHaveCount(await page.locator(".vgrid-row").count(), {
      timeout: 5000,
    });
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

test.describe("visual regression — grouped views", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();
  });

  test("groupRows mode with department grouping", async ({ page }) => {
    await page.selectOption("#group-by-select", "department");
    await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

    const grid = page.locator(".grid-container");
    await expect(grid).toHaveScreenshot("grouped-groupRows.png");
  });

  test("singleColumn mode with department grouping", async ({ page }) => {
    await page.selectOption("#group-by-select", "department");
    await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

    await page.selectOption("#display-type-select", "singleColumn");
    await expect(page.locator(".vgrid-header")).toContainText("Group");

    const grid = page.locator(".grid-container");
    await expect(grid).toHaveScreenshot("grouped-singleColumn.png");
  });

  test("multipleColumns mode with department grouping", async ({ page }) => {
    await page.selectOption("#group-by-select", "department");
    await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

    await page.selectOption("#display-type-select", "multipleColumns");
    await expect(page.locator(".vgrid-header")).toContainText("Department");

    const grid = page.locator(".grid-container");
    await expect(grid).toHaveScreenshot("grouped-multipleColumns.png");
  });

  test("multi-level grouping in groupRows mode", async ({ page }) => {
    await page.selectOption("#group-by-select", "department,location");
    await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

    const grid = page.locator(".grid-container");
    await expect(grid).toHaveScreenshot("grouped-multiLevel.png");
  });
});
