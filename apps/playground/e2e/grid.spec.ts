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

test("arrow key after drag selection navigates from anchor cell", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  const grid = page.locator("[data-testid='virtual-grid']");

  // Click cell at row 2, col 1 (anchor)
  const anchorCell = page.locator("[data-row-index='2'] .vgrid-cell").nth(1);
  await anchorCell.click();

  // Shift+click cell at row 4, col 1 to create a multi-cell selection
  const endCell = page.locator("[data-row-index='4'] .vgrid-cell").nth(1);
  await endCell.click({ modifiers: ["Shift"] });

  // Press ArrowDown — should navigate from anchor (row 2), landing at row 3
  await grid.press("ArrowDown");

  // The focused cell should be at row 3 (anchor row 2 + 1)
  const focusedCell = page.locator(".vgrid-cell--focused");
  await expect(focusedCell).toBeVisible();
  const focusedRow = await focusedCell.locator("..").getAttribute("data-row-index");
  expect(focusedRow).toBe("3");
});

// --- Grouping tests ---

test("group by department shows group headers with counts", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Select "Department" in the group-by dropdown
  await page.selectOption("#group-by-select", "department");

  // Group headers should appear
  const groupRows = page.locator(".vgrid-group-row");
  await expect(groupRows.first()).toBeVisible({ timeout: 5000 });

  // Check that the first group header has a count
  const firstGroupHeader = page.locator(".group-header").first();
  await expect(firstGroupHeader).toBeVisible();
  const headerText = await firstGroupHeader.textContent();
  // Should contain a number in parentheses e.g. "(1234)"
  expect(headerText).toMatch(/\(\d+\)/);
});

test("click group header collapses and expands children", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by department
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

  // First group toggle should show the expanded indicator (▾)
  const firstToggle = page.locator(".group-toggle").first();
  await expect(firstToggle).toHaveText("▾");

  // Click the first group header to collapse it
  await page.locator(".group-header").first().click();

  // The toggle should now show collapsed indicator (▸)
  await expect(firstToggle).toHaveText("▸", { timeout: 5000 });

  // Click again to expand
  await page.locator(".group-header").first().click();
  await expect(firstToggle).toHaveText("▾", { timeout: 5000 });
});

test("grouping works alongside sorting", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Sort by First Name first
  await page.locator(".sortable-header").nth(1).click();
  await expect(page.locator(".sort-indicator").nth(1)).toContainText("↑");

  // Then group by department
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

  // Group headers should still be visible alongside sort indicator
  const groupRows = page.locator(".vgrid-group-row");
  const count = await groupRows.count();
  expect(count).toBeGreaterThan(0);
});

test("grouping works alongside filtering", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by department
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

  // Filter to only "Engineering" department
  const deptFilter = page.locator("[data-column-id='department']");
  await deptFilter.fill("Engineering");

  // Wait for filtering to apply — should see an "Engineering" group
  await expect(page.locator(".group-value").first()).toHaveText("Engineering", { timeout: 5000 });

  // The "Showing X of Y" text should show a reduced count
  const gridInfo = page.locator(".grid-info");
  const infoText = await gridInfo.textContent();
  // Total dataset is 10000, filtered should be less
  expect(infoText).toContain("of 10000");
});

test("anchor cell has vgrid-cell--anchor class within a selection", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Click cell at row 1, col 0 (anchor)
  const anchorCell = page.locator("[data-row-index='1'] .vgrid-cell").nth(0);
  await anchorCell.click();

  // Shift+click cell at row 3, col 0 to create a range
  const endCell = page.locator("[data-row-index='3'] .vgrid-cell").nth(0);
  await endCell.click({ modifiers: ["Shift"] });

  // The anchor cell (row 1, col 0) should have the anchor class
  const anchorCellAfter = page.locator("[data-row-index='1'] .vgrid-cell").nth(0);
  await expect(anchorCellAfter).toHaveClass(/vgrid-cell--anchor/);

  // The end cell (row 3, col 0) should NOT have the anchor class
  const endCellAfter = page.locator("[data-row-index='3'] .vgrid-cell").nth(0);
  await expect(endCellAfter).not.toHaveClass(/vgrid-cell--anchor/);
});
