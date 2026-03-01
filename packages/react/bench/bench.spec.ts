import { expect, test } from "@playwright/test";
import {
  collectLoaf,
  computeStats,
  installLoafObserver,
  measureActionRun,
  measureScrollRun,
  metric,
  printBenchTable,
  type RunMetrics,
  synthesizeScroll,
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

// ---------------------------------------------------------------------------
// Auto-size scenario
// ---------------------------------------------------------------------------

test("auto-size columns performance", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, `/?rows=${BENCH_ROW_COUNT}`);
  await runBenchmark(page, "Auto-size columns", (p, cdp) =>
    measureActionRun(p, cdp, () => gridEval(p, "autoSizeColumns()")),
  );
});

// ---------------------------------------------------------------------------
// Mount timing
// ---------------------------------------------------------------------------

test("mount timing: 10k rows under 100ms", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  const results: number[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    // Navigate to about:blank to reset
    await page.goto("about:blank");
    await page.waitForTimeout(200);

    const before = await cdp.send("Performance.getMetrics");
    await page.goto(`/?rows=${BENCH_ROW_COUNT}`);
    await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();
    const after = await cdp.send("Performance.getMetrics");

    const scriptMs = (metric(after, "ScriptDuration") - metric(before, "ScriptDuration")) * 1000;
    results.push(scriptMs);
  }

  const stats = computeStats(results);
  console.log(
    `\n--- Mount timing ${BENCH_ROW_COUNT} rows (${RUN_COUNT} runs) ---\n` +
      `  ScriptDuration: median=${stats.median.toFixed(1)}ms p95=${stats.p95.toFixed(1)}ms`,
  );
  expect(stats.median).toBeLessThan(100);
});

// ---------------------------------------------------------------------------
// DOM node count validation
// ---------------------------------------------------------------------------

test("DOM node count: constant across dataset sizes", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  const counts: number[] = [];
  for (const rowCount of [1_000, 10_000, 100_000]) {
    await navigateAndWait(page, `/?rows=${rowCount}`);
    // Wait for rendering to settle
    await page.waitForTimeout(300);
    const count = await page.locator(".vgrid-row").count();
    counts.push(count);
  }

  console.log(
    `\n--- DOM node count validation ---\n` +
      `  1k rows: ${counts[0]} DOM rows\n` +
      `  10k rows: ${counts[1]} DOM rows\n` +
      `  100k rows: ${counts[2]} DOM rows`,
  );

  // All counts should be equal (virtualization renders same number of rows)
  expect(counts[0]).toBe(counts[1]);
  expect(counts[1]).toBe(counts[2]);
  // Sanity: not rendering all rows
  // biome-ignore lint/style/noNonNullAssertion: counts array is non-empty
  expect(counts[0]!).toBeLessThan(50);
});

// ---------------------------------------------------------------------------
// Scroll 100k rows — no long tasks
// ---------------------------------------------------------------------------

test("scroll 100k rows: no long animation frames", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, "/?rows=100000");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  // Warm up
  await synthesizeScroll(cdp, { x: 400, y: 300, distance: 500 });
  await page.waitForTimeout(300);

  // Reset scroll
  await page.locator(".vgrid-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(200);

  // Install LoAF observer and perform a large scroll
  await installLoafObserver(page);
  await synthesizeScroll(cdp, { x: 400, y: 300, distance: 10000 });
  await page.waitForTimeout(500);

  const loaf = await collectLoaf(page);
  console.log(
    `\n--- Scroll 100k rows LoAF ---\n` +
      `  Long frames: ${loaf.count}, max duration: ${loaf.maxDuration.toFixed(1)}ms, TBT: ${loaf.tbt.toFixed(1)}ms`,
  );
  expect(loaf.count).toBe(0);
});

// ---------------------------------------------------------------------------
// Smooth scroll 100k — no blank regions
// ---------------------------------------------------------------------------

test("scroll 100k rows: no blank regions", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, "/?rows=100000");

  // Jump to various scroll positions and verify rows are rendered
  const scrollPositions = [0, 500_000, 1_800_000, 3_500_000];
  for (const scrollTop of scrollPositions) {
    await page.locator(".vgrid-body").evaluate((el, top) => {
      el.scrollTop = top;
    }, scrollTop);
    // Wait for React to re-render
    await page.waitForTimeout(200);

    const rowCount = await page.locator(".vgrid-row").count();
    expect(rowCount).toBeGreaterThan(0);
  }
});
