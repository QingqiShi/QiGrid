import { expect, test } from "@playwright/test";
import {
  computeStats,
  measureActionRun,
  measureScrollRun,
  printBenchTable,
  type RunMetrics,
} from "../../benchmark/src/index";

const RUN_COUNT = 5;
const BENCH_ROW_COUNT = 10_000;

/** Navigate to the harness, wait for the grid to render, and verify __grid is available. */
async function navigateAndWait(page: import("@playwright/test").Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();
  await page.waitForFunction(() => "__grid" in window, undefined, { timeout: 5000 });
}

/** Call a grid API method on window.__grid in the browser context. */
function gridEval(page: import("@playwright/test").Page, script: string): Promise<void> {
  // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
  return page.evaluate(new Function(`(window).__grid.${script}`) as any);
}

/** Run a benchmark scenario: CDP setup, measurement loop, print table, assert median. */
async function runBenchmark(
  page: import("@playwright/test").Page,
  label: string,
  measure: (
    page: import("@playwright/test").Page,
    cdp: import("@playwright/test").CDPSession,
  ) => Promise<RunMetrics>,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  const runs: RunMetrics[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    runs.push(await measure(page, cdp));
  }

  printBenchTable(label, runs);

  const medianMaxFrame = computeStats(runs.map((r) => r.loaf.maxDuration)).median;
  expect(medianMaxFrame).toBeLessThan(200);
}

// ---------------------------------------------------------------------------
// Scroll scenarios
// ---------------------------------------------------------------------------

test("scroll performance: no selection", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, `/?rows=${BENCH_ROW_COUNT}`);
  await runBenchmark(page, "Scroll (no selection)", (p, cdp) => measureScrollRun(p, cdp));
});

test("scroll performance: large selection", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, `/?rows=${BENCH_ROW_COUNT}`);

  // Create a 500-row selection via window.__grid
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
    const grid = (window as any).__grid;
    grid.selectCell({ rowIndex: 0, columnIndex: 0 });
    grid.extendSelection({ rowIndex: 500, columnIndex: 8 });
  });
  await page.waitForTimeout(200);

  await runBenchmark(page, "Scroll (large selection)", (p, cdp) => measureScrollRun(p, cdp));
});

// ---------------------------------------------------------------------------
// Action scenarios
// ---------------------------------------------------------------------------

test("sort performance", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, `/?rows=${BENCH_ROW_COUNT}`);
  await runBenchmark(page, "Sort (salary)", (p, cdp) =>
    measureActionRun(p, cdp, () => gridEval(p, 'toggleSort("salary")')),
  );
});

test("filter performance", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, `/?rows=${BENCH_ROW_COUNT}`);
  await runBenchmark(page, "Filter (firstName=Alice)", async (p, cdp) => {
    const result = await measureActionRun(p, cdp, () =>
      gridEval(p, 'setColumnFilter("firstName", "Alice")'),
    );
    // Clear filter for next run
    await gridEval(p, 'setColumnFilter("firstName", "")');
    await p.waitForTimeout(200);
    return result;
  });
});

test("group by performance", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, `/?rows=${BENCH_ROW_COUNT}`);
  await runBenchmark(page, "Group by (department)", async (p, cdp) => {
    const result = await measureActionRun(p, cdp, () => gridEval(p, 'setGrouping(["department"])'));
    // Clear grouping for next run
    await gridEval(p, "setGrouping([])");
    await p.waitForTimeout(200);
    return result;
  });
});

test("group toggle performance", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, `/?rows=${BENCH_ROW_COUNT}&group=department`);

  // Get the first group ID
  const firstGroupId = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
    const grid = (window as any).__grid;
    const groupRow = grid.rows.find((r: { type: string }) => r.type === "group");
    return groupRow?.groupId;
  });
  expect(firstGroupId).toBeTruthy();

  await runBenchmark(page, "Group toggle (collapse/expand)", async (p, cdp) => {
    const result = await measureActionRun(p, cdp, () =>
      gridEval(p, `toggleGroupExpansion("${firstGroupId}")`),
    );
    // Expand again for next run
    await gridEval(p, `toggleGroupExpansion("${firstGroupId}")`);
    await p.waitForTimeout(200);
    return result;
  });
});
