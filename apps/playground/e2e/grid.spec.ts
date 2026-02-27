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

// --- Group display type tests ---

test("singleColumn mode shows Group column header and group rows have cells", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by department first
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

  // Switch to singleColumn display type
  await page.selectOption("#display-type-select", "singleColumn");

  // A "Group" column header should appear as the first header cell
  const firstHeader = page.locator(".vgrid-header-cell").first();
  await expect(firstHeader).toContainText("Group", { timeout: 5000 });

  // Group rows should have individual .vgrid-cell elements (not a single .vgrid-group-cell)
  const firstGroupRow = page.locator(".vgrid-group-row").first();
  await expect(firstGroupRow).toBeVisible({ timeout: 5000 });
  const groupRowCells = firstGroupRow.locator(".vgrid-cell");
  const cellCount = await groupRowCells.count();
  expect(cellCount).toBeGreaterThan(1);

  // There should be no .vgrid-group-cell elements (those are only for groupRows mode)
  await expect(firstGroupRow.locator(".vgrid-group-cell")).toHaveCount(0);

  // The group column cell should contain a .vgrid-group-toggle button
  const groupToggle = firstGroupRow.locator(".vgrid-group-toggle").first();
  await expect(groupToggle).toBeVisible();
});

test("multipleColumns mode shows per-level column headers", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by department
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

  // Switch to multipleColumns display type
  await page.selectOption("#display-type-select", "multipleColumns");

  // The first header cell should contain the grouped column's header ("Department")
  const firstHeader = page.locator(".vgrid-header-cell").first();
  await expect(firstHeader).toContainText("Department", { timeout: 5000 });

  // Group rows should have individual .vgrid-cell elements
  const firstGroupRow = page.locator(".vgrid-group-row").first();
  await expect(firstGroupRow).toBeVisible({ timeout: 5000 });
  const groupRowCells = firstGroupRow.locator(".vgrid-cell");
  const cellCount = await groupRowCells.count();
  expect(cellCount).toBeGreaterThan(1);

  // No .vgrid-group-cell elements (groupRows mode only)
  await expect(firstGroupRow.locator(".vgrid-group-cell")).toHaveCount(0);

  // The group toggle should be visible in the group column
  const groupToggle = firstGroupRow.locator(".vgrid-group-toggle").first();
  await expect(groupToggle).toBeVisible();
});

test("switching back to groupRows mode restores full-width group headers", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by department and switch to singleColumn
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });
  await page.selectOption("#display-type-select", "singleColumn");

  // Verify singleColumn is active (group rows have .vgrid-cell, not .vgrid-group-cell)
  await expect(page.locator(".vgrid-group-row .vgrid-cell").first()).toBeVisible({ timeout: 5000 });

  // Switch back to groupRows
  await page.selectOption("#display-type-select", "groupRows");

  // Full-width .vgrid-group-cell should return
  const firstGroupRow = page.locator(".vgrid-group-row").first();
  await expect(firstGroupRow).toBeVisible({ timeout: 5000 });
  await expect(firstGroupRow.locator(".vgrid-group-cell")).toBeVisible({ timeout: 5000 });

  // No individual .vgrid-cell elements in group rows in groupRows mode
  await expect(firstGroupRow.locator(".vgrid-cell")).toHaveCount(0);
});

test("expand and collapse works in singleColumn mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by department and switch to singleColumn
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });
  await page.selectOption("#display-type-select", "singleColumn");

  // Wait for singleColumn rendering
  const firstToggle = page.locator(".vgrid-group-toggle .group-toggle").first();
  await expect(firstToggle).toBeVisible({ timeout: 5000 });

  // Should start expanded (▾)
  await expect(firstToggle).toHaveText("▾");

  // Note the "Showing X of Y" text before collapse — total row count includes children
  const gridInfo = page.locator(".grid-info");
  const infoBefore = await gridInfo.textContent();
  const showingBefore = infoBefore?.match(/Showing (\d+) of/)?.[1];

  // Click the toggle to collapse
  await page.locator(".vgrid-group-toggle").first().click();

  // Should now show collapsed indicator (▸)
  await expect(firstToggle).toHaveText("▸", { timeout: 5000 });

  // The "Showing X of Y" total row count should decrease (children hidden from the flattened list)
  const infoAfter = await gridInfo.textContent();
  const showingAfter = infoAfter?.match(/Showing (\d+) of/)?.[1];
  expect(Number(showingAfter)).toBeLessThan(Number(showingBefore));

  // Click again to expand
  await page.locator(".vgrid-group-toggle").first().click();
  await expect(firstToggle).toHaveText("▾", { timeout: 5000 });

  // Row count should restore
  const infoRestored = await gridInfo.textContent();
  const showingRestored = infoRestored?.match(/Showing (\d+) of/)?.[1];
  expect(Number(showingRestored)).toBe(Number(showingBefore));
});

test("grouped data columns are hidden in singleColumn mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Without grouping, there should be 9 columns
  const headersBeforeGrouping = page.locator(".vgrid-header-cell");
  await expect(headersBeforeGrouping).toHaveCount(9);

  // Group by department and switch to singleColumn
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });
  await page.selectOption("#display-type-select", "singleColumn");

  // Wait for the "Group" column to appear
  await expect(page.locator(".vgrid-header-cell").first()).toContainText("Group", {
    timeout: 5000,
  });

  // Column count: 9 original - 1 hidden (department) + 1 group column = 9
  // The "Department" column should NOT be in the headers
  const headers = page.locator(".vgrid-header-cell");
  const headerCount = await headers.count();
  expect(headerCount).toBe(9); // 9 - 1 + 1 = 9

  // Verify "Department" is not present as a header text
  const headerTexts: string[] = [];
  for (let i = 0; i < headerCount; i++) {
    const text = await headers.nth(i).textContent();
    headerTexts.push(text ?? "");
  }
  // The grouped "Department" data column should be hidden
  const hasDepartmentDataHeader = headerTexts.some((t, idx) => idx > 0 && t.includes("Department"));
  expect(hasDepartmentDataHeader).toBe(false);
});

test("grouped data columns are hidden in multipleColumns mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by department and switch to multipleColumns
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });
  await page.selectOption("#display-type-select", "multipleColumns");

  // Wait for the group column header
  await expect(page.locator(".vgrid-header-cell").first()).toContainText("Department", {
    timeout: 5000,
  });

  // Column count: 9 original - 1 hidden (department) + 1 group column = 9
  const headers = page.locator(".vgrid-header-cell");
  const headerCount = await headers.count();
  expect(headerCount).toBe(9);

  // Verify that "Department" appears only once (as the group column, not as a data column)
  const headerTexts: string[] = [];
  for (let i = 0; i < headerCount; i++) {
    const text = await headers.nth(i).textContent();
    headerTexts.push(text ?? "");
  }
  const deptOccurrences = headerTexts.filter((t) => t.includes("Department")).length;
  expect(deptOccurrences).toBe(1); // Only the group column header, not the data column
});

test("multipleColumns with multi-level grouping shows two group columns", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by Dept + Location (two levels)
  await page.selectOption("#group-by-select", "department,location");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

  // Switch to multipleColumns display type
  await page.selectOption("#display-type-select", "multipleColumns");

  // Should have two group column headers: "Department" and "Location"
  const headers = page.locator(".vgrid-header-cell");
  await expect(headers.nth(0)).toContainText("Department", { timeout: 5000 });
  await expect(headers.nth(1)).toContainText("Location");

  // Original 9 - 2 hidden (department, location) + 2 group columns = 9
  await expect(headers).toHaveCount(9);

  // Group rows should have cells per column with toggle
  const firstGroupRow = page.locator(".vgrid-group-row").first();
  const toggleButton = firstGroupRow.locator(".vgrid-group-toggle").first();
  await expect(toggleButton).toBeVisible();
});

// --- Aggregation tests ---

test("group rows display aggregated salary totals in groupRows mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by department
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });

  // First group header should contain "Total: $" (salary aggregation)
  const firstGroupHeader = page.locator(".group-header").first();
  await expect(firstGroupHeader).toBeVisible();
  const headerText = await firstGroupHeader.textContent();
  expect(headerText).toMatch(/Total: \$/);
});

test("aggregated values display in singleColumn mode group rows", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Group by department and switch to singleColumn
  await page.selectOption("#group-by-select", "department");
  await expect(page.locator(".vgrid-group-row").first()).toBeVisible({ timeout: 5000 });
  await page.selectOption("#display-type-select", "singleColumn");

  // Wait for singleColumn rendering
  await expect(page.locator(".vgrid-group-toggle").first()).toBeVisible({ timeout: 5000 });

  // The group row should have cells — the salary column cell should have an aggregated value
  const firstGroupRow = page.locator(".vgrid-group-row").first();
  const cells = firstGroupRow.locator(".vgrid-cell");
  const cellCount = await cells.count();
  expect(cellCount).toBeGreaterThan(1);

  // At least one data cell in the group row should contain a salary (formatted as $X,XXX)
  const groupRowText = await firstGroupRow.textContent();
  expect(groupRowText).toMatch(/\$/);
});

// --- Keyboard navigation tests ---

test("Home moves focus to first column", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Click cell at row 2, col 3
  const cell = page.locator("[data-row-index='2'] .vgrid-cell").nth(3);
  await cell.click();
  await expect(page.locator(".vgrid-cell--focused")).toBeVisible();

  // Press Home
  const grid = page.locator("[data-testid='virtual-grid']");
  await grid.press("Home");

  // Focused cell should be in column 0 of row 2
  const focused = page.locator(".vgrid-cell--focused");
  await expect(focused).toBeVisible();
  const focusedRow = await focused.locator("..").getAttribute("data-row-index");
  expect(focusedRow).toBe("2");

  // Verify it's the first cell in the row
  const focusedCells = page.locator("[data-row-index='2'] .vgrid-cell--focused");
  const firstCell = page.locator("[data-row-index='2'] .vgrid-cell").first();
  await expect(focusedCells).toHaveCount(1);
  const focusedBox = await focused.boundingBox();
  const firstBox = await firstCell.boundingBox();
  expect(focusedBox).toBeTruthy();
  expect(firstBox).toBeTruthy();
  expect(focusedBox?.x).toBe(firstBox?.x);
});

test("End moves focus to last column", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Click cell at row 2, col 1
  const cell = page.locator("[data-row-index='2'] .vgrid-cell").nth(1);
  await cell.click();

  // Press End
  const grid = page.locator("[data-testid='virtual-grid']");
  await grid.press("End");

  // Focused cell should be in the last column of row 2
  const focused = page.locator(".vgrid-cell--focused");
  await expect(focused).toBeVisible();
  const focusedRow = await focused.locator("..").getAttribute("data-row-index");
  expect(focusedRow).toBe("2");

  // Verify it's the last cell in the row
  const lastCell = page.locator("[data-row-index='2'] .vgrid-cell").last();
  const focusedBox = await focused.boundingBox();
  const lastBox = await lastCell.boundingBox();
  expect(focusedBox).toBeTruthy();
  expect(lastBox).toBeTruthy();
  expect(focusedBox?.x).toBe(lastBox?.x);
});

test("PageDown moves focus down by page size", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Click cell at row 0, col 0
  const cell = page.locator("[data-row-index='0'] .vgrid-cell").nth(0);
  await cell.click();

  // Press PageDown
  const grid = page.locator("[data-testid='virtual-grid']");
  await grid.press("PageDown");

  // Focused cell should have moved down by a page (~600/36 = 16 rows)
  const focused = page.locator(".vgrid-cell--focused");
  await expect(focused).toBeVisible();
  const focusedRow = await focused.locator("..").getAttribute("data-row-index");
  const rowIdx = Number(focusedRow);
  // Page size is floor(600/36) = 16
  expect(rowIdx).toBe(16);
});

test("PageUp moves focus up by page size", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Click cell at row 0, col 0, then PageDown twice to get to row 32
  const cell = page.locator("[data-row-index='0'] .vgrid-cell").nth(0);
  await cell.click();

  const grid = page.locator("[data-testid='virtual-grid']");
  await grid.press("PageDown");
  await grid.press("PageDown");

  // Should be at row 32
  let focused = page.locator(".vgrid-cell--focused");
  await expect(focused).toBeVisible();
  let rowIdx = Number(await focused.locator("..").getAttribute("data-row-index"));
  expect(rowIdx).toBe(32);

  // Press PageUp
  await grid.press("PageUp");

  focused = page.locator(".vgrid-cell--focused");
  await expect(focused).toBeVisible();
  rowIdx = Number(await focused.locator("..").getAttribute("data-row-index"));
  expect(rowIdx).toBe(16);
});

test("boundary clamping: cannot navigate past grid edges", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Click cell at row 0, col 0
  const cell = page.locator("[data-row-index='0'] .vgrid-cell").nth(0);
  await cell.click();

  const grid = page.locator("[data-testid='virtual-grid']");

  // Press ArrowUp — should stay at row 0
  await grid.press("ArrowUp");
  let focused = page.locator(".vgrid-cell--focused");
  await expect(focused).toBeVisible();
  expect(await focused.locator("..").getAttribute("data-row-index")).toBe("0");

  // Press ArrowLeft — should stay at col 0
  await grid.press("ArrowLeft");
  focused = page.locator(".vgrid-cell--focused");
  const firstCell = page.locator("[data-row-index='0'] .vgrid-cell").first();
  const focusedBox = await focused.boundingBox();
  const firstBox = await firstCell.boundingBox();
  expect(focusedBox).toBeTruthy();
  expect(firstBox).toBeTruthy();
  expect(focusedBox?.x).toBe(firstBox?.x);

  // Press Home — should stay at col 0 (already there)
  await grid.press("Home");
  focused = page.locator(".vgrid-cell--focused");
  const focusedBox2 = await focused.boundingBox();
  expect(focusedBox2).toBeTruthy();
  expect(focusedBox2?.x).toBe(firstBox?.x);
});

test("focused cell has visible highlight CSS class", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Click a cell
  const cell = page.locator("[data-row-index='1'] .vgrid-cell").nth(2);
  await cell.click();

  // The clicked cell should have the focused CSS class
  const focused = page.locator(".vgrid-cell--focused");
  await expect(focused).toHaveCount(1);
});

test("no group columns when display type is singleColumn but grouping is empty", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  // Switch to singleColumn without setting a grouping
  await page.selectOption("#display-type-select", "singleColumn");

  // Should still have the original 9 columns (no group column generated)
  const headers = page.locator(".vgrid-header-cell");
  await expect(headers).toHaveCount(9);
  await expect(headers.nth(0)).toContainText("ID");
});
