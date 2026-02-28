import { type CDPSession, expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a named metric from CDP Performance.getMetrics result. */
function metric(result: { metrics: { name: string; value: number }[] }, name: string): number {
  return result.metrics.find((m) => m.name === name)?.value ?? 0;
}

/** Diff two CDP Performance.getMetrics snapshots and return key rendering counters. */
function diffMetrics(
  before: { metrics: { name: string; value: number }[] },
  after: { metrics: { name: string; value: number }[] },
) {
  return {
    layoutCount: metric(after, "LayoutCount") - metric(before, "LayoutCount"),
    layoutDurationMs: (metric(after, "LayoutDuration") - metric(before, "LayoutDuration")) * 1000,
    recalcStyleCount: metric(after, "RecalcStyleCount") - metric(before, "RecalcStyleCount"),
    recalcStyleDurationMs:
      (metric(after, "RecalcStyleDuration") - metric(before, "RecalcStyleDuration")) * 1000,
    scriptDurationMs: (metric(after, "ScriptDuration") - metric(before, "ScriptDuration")) * 1000,
    taskDurationMs: (metric(after, "TaskDuration") - metric(before, "TaskDuration")) * 1000,
  };
}

interface LoafEntry {
  duration: number;
  blockingDuration: number;
}

/** Install a Long Animation Frame (LoAF) observer on the page. */
async function installLoafObserver(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing custom window properties
    const w = window as any;
    w.__loafEntries = [];
    try {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // biome-ignore lint/suspicious/noExplicitAny: LoAF entry types not yet in TS lib
          const e = entry as any;
          w.__loafEntries.push({ duration: e.duration, blockingDuration: e.blockingDuration });
        }
      });
      obs.observe({ type: "long-animation-frame", buffered: true });
    } catch {
      // LoAF not available in this browser — ignore
    }
  });
}

/** Collect LoAF entries and compute Total Blocking Time (sum of duration - 50ms). */
async function collectLoaf(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing custom window properties
    const entries = (window as any).__loafEntries as LoafEntry[] | undefined;
    if (!entries || entries.length === 0) return { count: 0, tbt: 0, maxDuration: 0 };
    const tbt = entries.reduce((sum, e) => sum + Math.max(0, e.duration - 50), 0);
    const maxDuration = Math.max(...entries.map((e) => e.duration));
    return { count: entries.length, tbt, maxDuration };
  });
}

/** Perform a realistic scroll gesture via CDP Input.synthesizeScrollGesture. */
async function synthesizeScroll(cdp: CDPSession, opts: { x: number; y: number; distance: number }) {
  await cdp.send("Input.synthesizeScrollGesture", {
    x: opts.x,
    y: opts.y,
    yDistance: -opts.distance,
    speed: 2000,
    gestureSourceType: "mouse",
    preventFling: true,
  });
}

function logMetrics(label: string, m: ReturnType<typeof diffMetrics>) {
  const perLayout = m.layoutCount > 0 ? m.layoutDurationMs / m.layoutCount : 0;
  console.log(`\n--- ${label} ---`);
  console.log(`  LayoutCount:         ${m.layoutCount}`);
  console.log(
    `  LayoutDuration:      ${m.layoutDurationMs.toFixed(1)}ms (${perLayout.toFixed(2)}ms/layout)`,
  );
  console.log(`  RecalcStyleCount:    ${m.recalcStyleCount}`);
  console.log(`  RecalcStyleDuration: ${m.recalcStyleDurationMs.toFixed(1)}ms`);
  console.log(`  ScriptDuration:      ${m.scriptDurationMs.toFixed(1)}ms`);
  console.log(`  TaskDuration:        ${m.taskDurationMs.toFixed(1)}ms`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("scroll performance: no selection", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  // Warm up: scroll once and discard
  await synthesizeScroll(cdp, { x: 400, y: 300, distance: 500 });
  await page.waitForTimeout(300);

  // Reset scroll position
  await page.locator(".vgrid-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  // Install LoAF observer
  await installLoafObserver(page);

  // Snapshot before
  const before = await cdp.send("Performance.getMetrics");

  // Perform measured scroll (4000px at 2000px/s = ~2s gesture)
  await synthesizeScroll(cdp, { x: 400, y: 300, distance: 4000 });

  // Wait for rendering to settle
  await page.waitForTimeout(500);

  // Snapshot after
  const after = await cdp.send("Performance.getMetrics");
  const m = diffMetrics(before, after);
  const loaf = await collectLoaf(page);

  logMetrics("No selection", m);
  console.log(
    `  LoAF: ${loaf.count} entries, TBT=${loaf.tbt.toFixed(0)}ms, maxDuration=${loaf.maxDuration.toFixed(0)}ms`,
  );

  // Budget assertions — focused on per-layout cost and worst-case frames
  expect(m.layoutDurationMs / Math.max(m.layoutCount, 1)).toBeLessThan(1); // <1ms per layout
  expect(loaf.maxDuration).toBeLessThan(200); // no single frame > 200ms
});

test("scroll performance: large range selection", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP only works with Chromium");

  await page.goto("/");
  await expect(page.locator("[data-testid='virtual-grid']")).toBeVisible();

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");

  // Create a large selection: click first cell, scroll down, shift+click at row 500
  const firstCell = page.locator("[data-row-index='0'] .vgrid-cell").first();
  await firstCell.click();

  await page.locator(".vgrid-body").evaluate((el) => {
    el.scrollTop = 500 * 36;
  });
  await page.waitForTimeout(300);

  const targetCell = page.locator("[data-row-index='500'] .vgrid-cell").first();
  await targetCell.click({ modifiers: ["Shift"] });
  await page.waitForTimeout(200);

  // Reset to top for measurement
  await page.locator(".vgrid-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  // Warm up
  await synthesizeScroll(cdp, { x: 400, y: 300, distance: 500 });
  await page.waitForTimeout(300);
  await page.locator(".vgrid-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  // Install LoAF observer
  await installLoafObserver(page);

  // Snapshot before
  const before = await cdp.send("Performance.getMetrics");

  // Perform measured scroll (4000px at 2000px/s = ~2s gesture)
  await synthesizeScroll(cdp, { x: 400, y: 300, distance: 4000 });

  // Wait for rendering to settle
  await page.waitForTimeout(500);

  // Snapshot after
  const after = await cdp.send("Performance.getMetrics");
  const m = diffMetrics(before, after);
  const loaf = await collectLoaf(page);

  logMetrics("Large selection", m);
  console.log(
    `  LoAF: ${loaf.count} entries, TBT=${loaf.tbt.toFixed(0)}ms, maxDuration=${loaf.maxDuration.toFixed(0)}ms`,
  );

  // Budget assertions — focused on per-layout cost and worst-case frames
  expect(m.layoutDurationMs / Math.max(m.layoutCount, 1)).toBeLessThan(1); // <1ms per layout
  expect(loaf.maxDuration).toBeLessThan(200); // no single frame > 200ms
});
