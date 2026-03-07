import { describe, expect, it } from "vitest";
import { computePinOffsets, reorderColumnsForPinning } from "./pinnedColumns";
import type { Column } from "./types";

type Item = { a: string };

function col(id: string, width: number, pin?: "left" | "right"): Column<Item> {
  return {
    id,
    accessorKey: undefined,
    accessorFn: undefined,
    header: id,
    getValue: () => undefined,
    filterFn: undefined,
    sortingFn: undefined,
    aggFunc: undefined,
    width,
    minWidth: 50,
    maxWidth: 500,
    enableAutoSize: true,
    pin,
  };
}

describe("reorderColumnsForPinning", () => {
  it("returns same reference when no columns are pinned (fast path)", () => {
    const columns = [col("a", 100), col("b", 100), col("c", 100)];
    const result = reorderColumnsForPinning(columns);
    expect(result).toBe(columns);
  });

  it("moves left-pinned columns to the start", () => {
    const columns = [col("a", 100), col("b", 100, "left"), col("c", 100)];
    const result = reorderColumnsForPinning(columns);
    expect(result.map((c) => c.id)).toEqual(["b", "a", "c"]);
  });

  it("moves right-pinned columns to the end", () => {
    const columns = [col("a", 100, "right"), col("b", 100), col("c", 100)];
    const result = reorderColumnsForPinning(columns);
    expect(result.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("handles mixed left and right pins", () => {
    const columns = [
      col("a", 100),
      col("b", 100, "left"),
      col("c", 100, "right"),
      col("d", 100),
    ];
    const result = reorderColumnsForPinning(columns);
    expect(result.map((c) => c.id)).toEqual(["b", "a", "d", "c"]);
  });

  it("preserves order within each group", () => {
    const columns = [
      col("a", 100, "right"),
      col("b", 100, "left"),
      col("c", 100),
      col("d", 100, "left"),
      col("e", 100, "right"),
    ];
    const result = reorderColumnsForPinning(columns);
    expect(result.map((c) => c.id)).toEqual(["b", "d", "c", "a", "e"]);
  });
});

describe("computePinOffsets", () => {
  it("returns all-undefined pins when no columns are pinned", () => {
    const columns = [col("a", 100), col("b", 200)];
    const result = computePinOffsets(columns);
    expect(result).toEqual([
      { pin: undefined, stickyOffset: 0, isLastPinLeft: false, isFirstPinRight: false },
      { pin: undefined, stickyOffset: 0, isLastPinLeft: false, isFirstPinRight: false },
    ]);
  });

  it("computes cumulative left offsets", () => {
    const columns = [col("a", 100, "left"), col("b", 150, "left"), col("c", 200)];
    const result = computePinOffsets(columns);
    expect(result[0]).toEqual({
      pin: "left",
      stickyOffset: 0,
      isLastPinLeft: false,
      isFirstPinRight: false,
    });
    expect(result[1]).toEqual({
      pin: "left",
      stickyOffset: 100,
      isLastPinLeft: true,
      isFirstPinRight: false,
    });
    expect(result[2]).toEqual({
      pin: undefined,
      stickyOffset: 0,
      isLastPinLeft: false,
      isFirstPinRight: false,
    });
  });

  it("computes cumulative right offsets", () => {
    const columns = [col("a", 100), col("b", 150, "right"), col("c", 200, "right")];
    const result = computePinOffsets(columns);
    expect(result[0]).toEqual({
      pin: undefined,
      stickyOffset: 0,
      isLastPinLeft: false,
      isFirstPinRight: false,
    });
    expect(result[1]).toEqual({
      pin: "right",
      stickyOffset: 200,
      isLastPinLeft: false,
      isFirstPinRight: true,
    });
    expect(result[2]).toEqual({
      pin: "right",
      stickyOffset: 0,
      isLastPinLeft: false,
      isFirstPinRight: false,
    });
  });

  it("sets boundary flags correctly for mixed pins", () => {
    const columns = [
      col("a", 80, "left"),
      col("b", 120, "left"),
      col("c", 200),
      col("d", 100, "right"),
    ];
    const result = computePinOffsets(columns);
    expect(result[0]?.isLastPinLeft).toBe(false);
    expect(result[1]?.isLastPinLeft).toBe(true);
    expect(result[3]?.isFirstPinRight).toBe(true);
  });
});
