/**
 * Compact benchmark reporter — shows only mean, p99, rme, and samples.
 * Extends the built-in BenchmarkReporter to keep JSON output, comparison,
 * and suite-level progress intact; only overrides the table rendering.
 *
 * Also enforces performance thresholds: if any bench mean exceeds its
 * target, the run exits with code 1.
 */

import type { SerializedError, TestModule, TestRunEndReason, TestSuite } from "vitest/node";
import { BenchmarkReporter } from "vitest/reporters";

declare const process: { exitCode: number };

function pad(s: string, n: number, align: "left" | "right" = "right"): string {
  return align === "left" ? s.padEnd(n) : s.padStart(n);
}

function fmtMs(ms: number): string {
  if (ms < 0.001) return `${(ms * 1_000_000).toFixed(0)}ns`;
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Performance thresholds in ms, keyed by "suiteName/benchName". */
const THRESHOLDS: Record<string, number> = {
  "sortRows 100k/by string column": 60,
  "filterRows 100k/string includes": 30,
  "groupRows 100k/single column": 60,
  "full pipeline 100k/filter + wrap + sort + group + flatten": 100,
  "computeVirtualRange 1M/mid-scroll": 1,
  "sliceVisibleRows 1M/from middle": 0.5,
};

interface BenchResult {
  key: string;
  mean: number;
  threshold: number;
}

export default class CompactBenchReporter extends BenchmarkReporter {
  private results: BenchResult[] = [];

  protected override printTestModule(testModule: TestModule): void {
    this.printCompactTable(testModule);
  }

  override onTestSuiteResult(testSuite: TestSuite): void {
    this.collectResults(testSuite);
    this.printCompactTable(testSuite);
  }

  override async onTestRunEnd(
    _testModules: ReadonlyArray<TestModule>,
    _unhandledErrors: ReadonlyArray<SerializedError>,
    _reason: TestRunEndReason,
  ): Promise<void> {
    const violations = this.results.filter((r) => r.mean > r.threshold);
    if (violations.length > 0) {
      this.log("\n  ✗ Threshold violations:");
      for (const v of violations) {
        this.log(`    ${v.key}: ${fmtMs(v.mean)} exceeds ${fmtMs(v.threshold)}`);
      }
      process.exitCode = 1;
    } else if (this.results.length > 0) {
      this.log(`\n  ✓ All ${this.results.length} thresholds passed`);
    }
    this.log("");
  }

  // biome-ignore lint/suspicious/noExplicitAny: accessing internal runner task structure
  private collectResults(testTask: any): void {
    const task = testTask.task ?? testTask;
    if (!task.tasks) return;

    const suiteName = task.name ?? "";
    // biome-ignore lint/suspicious/noExplicitAny: tinybench internal benchmark result
    for (const t of task.tasks.filter((t: any) => t.meta?.benchmark && t.result?.benchmark)) {
      const key = `${suiteName}/${t.name}`;
      const threshold = THRESHOLDS[key];
      if (threshold !== undefined) {
        this.results.push({ key, mean: t.result.benchmark.mean as number, threshold });
      }
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: accessing internal runner task structure
  private printCompactTable(testTask: any): void {
    const task = testTask.task ?? testTask;
    if (!task.tasks) return;

    // biome-ignore lint/suspicious/noExplicitAny: tinybench internal benchmark result
    const benches = task.tasks.filter((t: any) => t.meta?.benchmark && t.result?.benchmark);
    if (benches.length === 0) return;

    const suiteName = task.name ?? "";
    // biome-ignore lint/suspicious/noExplicitAny: tinybench result shape
    const rows = benches.map((t: any) => {
      const b = t.result.benchmark;
      return {
        name: t.name as string,
        mean: b.mean as number,
        p99: b.p99 as number,
        rme: b.rme as number,
        samples: (b.sampleCount ?? b.samples?.length ?? 0) as number,
      };
    });

    const nameW = Math.max(4, ...rows.map((r: { name: string }) => r.name.length));
    const header = `  ${pad("name", nameW, "left")}  ${pad("mean", 10)}  ${pad("p99", 10)}  ${pad("rme", 8)}  ${pad("samples", 7)}`;

    this.log(`\n  ${suiteName}`);
    this.log(header);
    for (const r of rows) {
      const line = `  ${pad(r.name, nameW, "left")}  ${pad(fmtMs(r.mean), 10)}  ${pad(fmtMs(r.p99), 10)}  ${pad(`±${r.rme.toFixed(2)}%`, 8)}  ${pad(String(r.samples), 7)}`;
      this.log(line);
    }
  }
}
