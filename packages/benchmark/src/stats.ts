export interface Stats {
  median: number;
  p95: number;
  min: number;
  max: number;
}

/** Compute median, p95, min, max from a set of values. */
export function computeStats(values: number[]): Stats {
  if (values.length === 0) return { median: 0, p95: 0, min: 0, max: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  // biome-ignore lint/style/noNonNullAssertion: sorted array is non-empty
  const min = sorted[0]!;
  // biome-ignore lint/style/noNonNullAssertion: sorted array is non-empty
  const max = sorted[sorted.length - 1]!;

  const medianIdx = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? // biome-ignore lint/style/noNonNullAssertion: index is valid
        (sorted[medianIdx - 1]! + sorted[medianIdx]!) / 2
      : // biome-ignore lint/style/noNonNullAssertion: index is valid
        sorted[medianIdx]!;

  const p95Idx = Math.ceil(sorted.length * 0.95) - 1;
  // biome-ignore lint/style/noNonNullAssertion: index is valid
  const p95 = sorted[Math.max(0, p95Idx)]!;

  return { median, p95, min, max };
}

/** Print a formatted statistics table for a benchmark scenario. */
export function printBenchTable(
  label: string,
  runs: { loaf: { maxDuration: number; tbt: number }; scriptDurationMs: number }[],
): void {
  const maxDurations = runs.map((r) => r.loaf.maxDuration);
  const tbts = runs.map((r) => r.loaf.tbt);
  const scripts = runs.map((r) => r.scriptDurationMs);

  const maxDurStats = computeStats(maxDurations);
  const tbtStats = computeStats(tbts);
  const scriptStats = computeStats(scripts);

  const fmt = (v: number): string => `${v.toFixed(1)}ms`;

  console.log(`\n--- ${label} (${runs.length} runs) ---`);
  console.log(
    `  Max Frame Duration: median=${fmt(maxDurStats.median)} p95=${fmt(maxDurStats.p95)} min=${fmt(maxDurStats.min)} max=${fmt(maxDurStats.max)}`,
  );
  console.log(
    `  Total Blocking Time: median=${fmt(tbtStats.median)} p95=${fmt(tbtStats.p95)} min=${fmt(tbtStats.min)} max=${fmt(tbtStats.max)}`,
  );
  console.log(
    `  Script Duration: median=${fmt(scriptStats.median)} p95=${fmt(scriptStats.p95)} min=${fmt(scriptStats.min)} max=${fmt(scriptStats.max)}`,
  );
}
