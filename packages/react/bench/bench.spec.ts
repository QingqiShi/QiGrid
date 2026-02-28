import { expect, test } from "@playwright/test";
import {
  computeStats,
  measureActionRun,
  measureScrollRun,
  printBenchTable,
  type RunMetrics,
} from "../../benchmark/src/index";

const RUN_COUNT = 5;

/** Navigate to the harness, wait for the grid to render, and verify __grid is available. */
async function navigateAndWait(page: import("@playwright/test").Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();
  await page.waitForFunction(() => "__grid" in window, undefined, { timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Scroll scenarios
// ---------------------------------------------------------------------------

test("scroll performance: no selection", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, "/?rows=10000");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  const runs: RunMetrics[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    runs.push(await measureScrollRun(page, cdp));
  }

  printBenchTable(
    "Scroll (no selection)",
    runs.map((r) => ({
      maxDuration: r.loaf.maxDuration,
      tbt: r.loaf.tbt,
      scriptDurationMs: r.scriptDurationMs,
    })),
    RUN_COUNT,
  );

  const medianMaxFrame = computeStats(runs.map((r) => r.loaf.maxDuration)).median;
  expect(medianMaxFrame).toBeLessThan(200);
});

test("scroll performance: large selection", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, "/?rows=10000");

  // Create a 500-row selection via window.__grid
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
    const grid = (window as any).__grid;
    grid.selectCell({ rowIndex: 0, columnIndex: 0 });
    grid.extendSelection({ rowIndex: 500, columnIndex: 8 });
  });
  await page.waitForTimeout(200);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  const runs: RunMetrics[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    runs.push(await measureScrollRun(page, cdp));
  }

  printBenchTable(
    "Scroll (large selection)",
    runs.map((r) => ({
      maxDuration: r.loaf.maxDuration,
      tbt: r.loaf.tbt,
      scriptDurationMs: r.scriptDurationMs,
    })),
    RUN_COUNT,
  );

  const medianMaxFrame = computeStats(runs.map((r) => r.loaf.maxDuration)).median;
  expect(medianMaxFrame).toBeLessThan(200);
});

// ---------------------------------------------------------------------------
// Action scenarios
// ---------------------------------------------------------------------------

test("sort performance", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, "/?rows=10000");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  const runs: RunMetrics[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    runs.push(
      await measureActionRun(page, cdp, async () => {
        await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
          (window as any).__grid.toggleSort("salary");
        });
      }),
    );
  }

  printBenchTable(
    "Sort (salary)",
    runs.map((r) => ({
      maxDuration: r.loaf.maxDuration,
      tbt: r.loaf.tbt,
      scriptDurationMs: r.scriptDurationMs,
    })),
    RUN_COUNT,
  );

  const medianMaxFrame = computeStats(runs.map((r) => r.loaf.maxDuration)).median;
  expect(medianMaxFrame).toBeLessThan(200);
});

test("filter performance", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, "/?rows=10000");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  const runs: RunMetrics[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    // Apply filter
    runs.push(
      await measureActionRun(page, cdp, async () => {
        await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
          (window as any).__grid.setColumnFilter("firstName", "Alice");
        });
      }),
    );
    // Clear filter for next run
    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
      (window as any).__grid.setColumnFilter("firstName", "");
    });
    await page.waitForTimeout(200);
  }

  printBenchTable(
    "Filter (firstName=Alice)",
    runs.map((r) => ({
      maxDuration: r.loaf.maxDuration,
      tbt: r.loaf.tbt,
      scriptDurationMs: r.scriptDurationMs,
    })),
    RUN_COUNT,
  );

  const medianMaxFrame = computeStats(runs.map((r) => r.loaf.maxDuration)).median;
  expect(medianMaxFrame).toBeLessThan(200);
});

test("group by performance", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, "/?rows=10000");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  const runs: RunMetrics[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    // Apply grouping
    runs.push(
      await measureActionRun(page, cdp, async () => {
        await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
          (window as any).__grid.setGrouping(["department"]);
        });
      }),
    );
    // Clear grouping for next run
    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
      (window as any).__grid.setGrouping([]);
    });
    await page.waitForTimeout(200);
  }

  printBenchTable(
    "Group by (department)",
    runs.map((r) => ({
      maxDuration: r.loaf.maxDuration,
      tbt: r.loaf.tbt,
      scriptDurationMs: r.scriptDurationMs,
    })),
    RUN_COUNT,
  );

  const medianMaxFrame = computeStats(runs.map((r) => r.loaf.maxDuration)).median;
  expect(medianMaxFrame).toBeLessThan(200);
});

test("group toggle performance", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await navigateAndWait(page, "/?rows=10000&group=department");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  // Get the first group ID
  const firstGroupId = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
    const grid = (window as any).__grid;
    const groupRow = grid.rows.find((r: { type: string }) => r.type === "group");
    return groupRow?.groupId;
  });
  expect(firstGroupId).toBeTruthy();

  const runs: RunMetrics[] = [];
  for (let i = 0; i < RUN_COUNT; i++) {
    // Collapse group
    runs.push(
      await measureActionRun(page, cdp, async () => {
        await page.evaluate((gid) => {
          // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
          (window as any).__grid.toggleGroupExpansion(gid);
        }, firstGroupId);
      }),
    );
    // Expand again for next run
    await page.evaluate((gid) => {
      // biome-ignore lint/suspicious/noExplicitAny: benchmark harness window API
      (window as any).__grid.toggleGroupExpansion(gid);
    }, firstGroupId);
    await page.waitForTimeout(200);
  }

  printBenchTable(
    "Group toggle (collapse/expand)",
    runs.map((r) => ({
      maxDuration: r.loaf.maxDuration,
      tbt: r.loaf.tbt,
      scriptDurationMs: r.scriptDurationMs,
    })),
    RUN_COUNT,
  );

  const medianMaxFrame = computeStats(runs.map((r) => r.loaf.maxDuration)).median;
  expect(medianMaxFrame).toBeLessThan(200);
});
