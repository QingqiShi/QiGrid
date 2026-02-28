import type { CDPSession, Page } from "@playwright/test";

/** Extract a named metric from CDP Performance.getMetrics result. */
export function metric(
  result: { metrics: { name: string; value: number }[] },
  name: string,
): number {
  return result.metrics.find((m) => m.name === name)?.value ?? 0;
}

/** Diff two CDP Performance.getMetrics snapshots and return key rendering counters. */
export function diffMetrics(
  before: { metrics: { name: string; value: number }[] },
  after: { metrics: { name: string; value: number }[] },
): {
  layoutCount: number;
  layoutDurationMs: number;
  recalcStyleCount: number;
  recalcStyleDurationMs: number;
  scriptDurationMs: number;
  taskDurationMs: number;
} {
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

export interface LoafResult {
  count: number;
  tbt: number;
  maxDuration: number;
}

/** Install a Long Animation Frame (LoAF) observer on the page, clearing previous entries. */
export async function installLoafObserver(page: Page): Promise<void> {
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: LoAF window API
    const w = window as any;

    // Disconnect any previous observer to avoid accumulation across runs
    if (w.__loafObserver) {
      w.__loafObserver.disconnect();
    }

    w.__loafEntries = [];
    try {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // biome-ignore lint/suspicious/noExplicitAny: LoAF entry types not yet in TS lib
          const e = entry as any;
          w.__loafEntries.push({
            duration: e.duration,
            blockingDuration: e.blockingDuration,
          });
        }
      });
      obs.observe({ type: "long-animation-frame", buffered: false });
      w.__loafObserver = obs;
    } catch {
      // LoAF not available in this browser — ignore
    }
  });
}

/** Collect LoAF entries and compute Total Blocking Time. */
export async function collectLoaf(page: Page): Promise<LoafResult> {
  return page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: LoAF window API
    const entries = (window as any).__loafEntries as
      | { duration: number; blockingDuration: number }[]
      | undefined;
    if (!entries || entries.length === 0) return { count: 0, tbt: 0, maxDuration: 0 };
    const tbt = entries.reduce((sum, e) => sum + Math.max(0, e.duration - 50), 0);
    const maxDuration = entries.reduce((m, e) => (e.duration > m ? e.duration : m), 0);
    return { count: entries.length, tbt, maxDuration };
  });
}

/** Perform a realistic scroll gesture via CDP Input.synthesizeScrollGesture. */
export async function synthesizeScroll(
  cdp: CDPSession,
  opts: { x: number; y: number; distance: number },
): Promise<void> {
  await cdp.send("Input.synthesizeScrollGesture", {
    x: opts.x,
    y: opts.y,
    yDistance: -opts.distance,
    speed: 2000,
    gestureSourceType: "mouse",
    preventFling: true,
  });
}

export interface RunMetrics {
  layoutCount: number;
  layoutDurationMs: number;
  recalcStyleCount: number;
  recalcStyleDurationMs: number;
  scriptDurationMs: number;
  taskDurationMs: number;
  loaf: LoafResult;
}

/**
 * Complete scroll measurement cycle:
 * reset scroll → warm up → install LoAF → snapshot → scroll 4000px → settle → snapshot → collect
 */
export async function measureScrollRun(page: Page, cdp: CDPSession): Promise<RunMetrics> {
  // Reset scroll position
  await page.locator(".vgrid-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(200);

  // Warm up
  await synthesizeScroll(cdp, { x: 400, y: 300, distance: 500 });
  await page.waitForTimeout(200);

  // Reset again
  await page.locator(".vgrid-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(200);

  // Install LoAF observer
  await installLoafObserver(page);

  // Snapshot before
  const before = await cdp.send("Performance.getMetrics");

  // Perform measured scroll
  await synthesizeScroll(cdp, { x: 400, y: 300, distance: 4000 });

  // Wait for rendering to settle
  await page.waitForTimeout(500);

  // Snapshot after
  const after = await cdp.send("Performance.getMetrics");
  const metrics = diffMetrics(before, after);
  const loaf = await collectLoaf(page);

  return { ...metrics, loaf };
}

/**
 * Complete action measurement cycle:
 * install LoAF → snapshot → action → wait for idle → snapshot → collect
 */
export async function measureActionRun(
  page: Page,
  cdp: CDPSession,
  action: () => Promise<void>,
): Promise<RunMetrics> {
  // Install LoAF observer
  await installLoafObserver(page);

  // Snapshot before
  const before = await cdp.send("Performance.getMetrics");

  // Perform the action
  await action();

  // Wait for rendering to settle
  await page.waitForTimeout(500);

  // Snapshot after
  const after = await cdp.send("Performance.getMetrics");
  const metrics = diffMetrics(before, after);
  const loaf = await collectLoaf(page);

  return { ...metrics, loaf };
}
