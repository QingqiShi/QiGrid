import { describe, expect, it } from "vitest";
import type { Row, VirtualRange } from "../types";
import { computeVirtualRange, DEFAULT_OVERSCAN, sliceVisibleRows } from "../virtualization";

function makeRows(count: number): Row<{ id: number }>[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    original: { id: i },
    getValue: () => i,
  }));
}

describe("computeVirtualRange", () => {
  describe("basic range computation", () => {
    it("computes range at the top (scrollTop=0)", () => {
      const range = computeVirtualRange({
        totalRowCount: 1000,
        scrollTop: 0,
        containerHeight: 500,
        rowHeight: 50,
      });
      expect(range.startIndex).toBe(0);
      // firstVisible=0, visible=10, end = 0+10+5 = 15
      expect(range.endIndex).toBe(15);
      expect(range.totalHeight).toBe(50_000);
      expect(range.offsetTop).toBe(0);
    });

    it("computes range in the middle", () => {
      const range = computeVirtualRange({
        totalRowCount: 1000,
        scrollTop: 5000,
        containerHeight: 500,
        rowHeight: 50,
      });
      // firstVisible = floor(5000/50) = 100
      // visible = ceil(500/50) = 10
      // start = 100 - 5 = 95
      // end = 100 + 10 + 5 = 115
      expect(range.startIndex).toBe(95);
      expect(range.endIndex).toBe(115);
      expect(range.totalHeight).toBe(50_000);
      expect(range.offsetTop).toBe(95 * 50);
    });

    it("computes range at exact bottom", () => {
      // totalHeight = 1000*50 = 50000, maxScroll = 50000-500 = 49500
      const range = computeVirtualRange({
        totalRowCount: 1000,
        scrollTop: 49500,
        containerHeight: 500,
        rowHeight: 50,
      });
      // firstVisible = floor(49500/50) = 990
      // visible = ceil(500/50) = 10
      // start = 990 - 5 = 985
      // end = min(1000, 990+10+5) = 1000
      expect(range.startIndex).toBe(985);
      expect(range.endIndex).toBe(1000);
      expect(range.totalHeight).toBe(50_000);
      expect(range.offsetTop).toBe(985 * 50);
    });
  });

  describe("overscan clamping", () => {
    it("clamps start to 0 (no negative indices)", () => {
      const range = computeVirtualRange({
        totalRowCount: 100,
        scrollTop: 50,
        containerHeight: 500,
        rowHeight: 50,
      });
      // firstVisible=1, start = max(0, 1-5) = 0
      expect(range.startIndex).toBe(0);
    });

    it("clamps end to totalRowCount", () => {
      const range = computeVirtualRange({
        totalRowCount: 20,
        scrollTop: 0,
        containerHeight: 500,
        rowHeight: 50,
      });
      // firstVisible=0, visible=10, end = min(20, 0+10+5) = 15
      expect(range.endIndex).toBe(15);
    });

    it("uses default overscan of 5", () => {
      expect(DEFAULT_OVERSCAN).toBe(5);
      const range = computeVirtualRange({
        totalRowCount: 1000,
        scrollTop: 2500,
        containerHeight: 500,
        rowHeight: 50,
      });
      // firstVisible=50, start=45, end=65
      expect(range.startIndex).toBe(45);
      expect(range.endIndex).toBe(65);
    });

    it("respects custom overscan", () => {
      const range = computeVirtualRange({
        totalRowCount: 1000,
        scrollTop: 2500,
        containerHeight: 500,
        rowHeight: 50,
        overscan: 10,
      });
      // firstVisible=50, start=40, end=70
      expect(range.startIndex).toBe(40);
      expect(range.endIndex).toBe(70);
    });

    it("works with overscan=0", () => {
      const range = computeVirtualRange({
        totalRowCount: 1000,
        scrollTop: 2500,
        containerHeight: 500,
        rowHeight: 50,
        overscan: 0,
      });
      // firstVisible=50, start=50, end=60
      expect(range.startIndex).toBe(50);
      expect(range.endIndex).toBe(60);
    });
  });

  describe("edge cases", () => {
    it("returns zeroed range for zero rows", () => {
      const range = computeVirtualRange({
        totalRowCount: 0,
        scrollTop: 0,
        containerHeight: 500,
        rowHeight: 50,
      });
      expect(range).toEqual({
        startIndex: 0,
        endIndex: 0,
        totalHeight: 0,
        offsetTop: 0,
      });
    });

    it("returns zeroed range for zero rowHeight", () => {
      const range = computeVirtualRange({
        totalRowCount: 100,
        scrollTop: 0,
        containerHeight: 500,
        rowHeight: 0,
      });
      expect(range).toEqual({
        startIndex: 0,
        endIndex: 0,
        totalHeight: 0,
        offsetTop: 0,
      });
    });

    it("handles container larger than total data height", () => {
      const range = computeVirtualRange({
        totalRowCount: 5,
        scrollTop: 0,
        containerHeight: 5000,
        rowHeight: 50,
      });
      // totalHeight=250, maxScroll=0, firstVisible=0, visible=100
      // start=0, end=min(5, 0+100+5)=5
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(5);
      expect(range.totalHeight).toBe(250);
    });

    it("handles single row", () => {
      const range = computeVirtualRange({
        totalRowCount: 1,
        scrollTop: 0,
        containerHeight: 500,
        rowHeight: 50,
      });
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(1);
      expect(range.totalHeight).toBe(50);
    });

    it("clamps negative scrollTop to 0", () => {
      const range = computeVirtualRange({
        totalRowCount: 1000,
        scrollTop: -100,
        containerHeight: 500,
        rowHeight: 50,
      });
      expect(range.startIndex).toBe(0);
      // Same as scrollTop=0
      expect(range.endIndex).toBe(15);
    });

    it("clamps scrollTop beyond max", () => {
      const range = computeVirtualRange({
        totalRowCount: 1000,
        scrollTop: 999999,
        containerHeight: 500,
        rowHeight: 50,
      });
      // Clamped to maxScrollTop=49500
      // Same as exact bottom test
      expect(range.startIndex).toBe(985);
      expect(range.endIndex).toBe(1000);
    });

    it("handles containerHeight equal to totalHeight", () => {
      const range = computeVirtualRange({
        totalRowCount: 10,
        scrollTop: 0,
        containerHeight: 500,
        rowHeight: 50,
      });
      // totalHeight=500=containerHeight, maxScroll=0
      // firstVisible=0, visible=10, start=0, end=min(10,15)=10
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(10);
    });

    it("handles non-divisible containerHeight/rowHeight", () => {
      const range = computeVirtualRange({
        totalRowCount: 1000,
        scrollTop: 0,
        containerHeight: 530,
        rowHeight: 50,
      });
      // firstVisible=0, visible=ceil(530/50)=11
      // start=0, end=0+11+5=16
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(16);
    });

    it("returns same EMPTY_RANGE reference for invalid inputs", () => {
      const a = computeVirtualRange({
        totalRowCount: 0,
        scrollTop: 0,
        containerHeight: 500,
        rowHeight: 50,
      });
      const b = computeVirtualRange({
        totalRowCount: 100,
        scrollTop: 0,
        containerHeight: 500,
        rowHeight: 0,
      });
      expect(a).toBe(b);
    });
  });
});

describe("sliceVisibleRows", () => {
  it("returns correct subset of rows", () => {
    const rows = makeRows(100);
    const range: VirtualRange = {
      startIndex: 10,
      endIndex: 20,
      totalHeight: 5000,
      offsetTop: 500,
    };
    const result = sliceVisibleRows(rows, range);
    expect(result).toHaveLength(10);
    expect(result[0]?.index).toBe(10);
    expect(result[9]?.index).toBe(19);
  });

  it("preserves row references", () => {
    const rows = makeRows(50);
    const range: VirtualRange = {
      startIndex: 5,
      endIndex: 10,
      totalHeight: 2500,
      offsetTop: 250,
    };
    const result = sliceVisibleRows(rows, range);
    expect(result[0]).toBe(rows[5]);
    expect(result[4]).toBe(rows[9]);
  });

  it("returns empty array for empty range", () => {
    const rows = makeRows(100);
    const range: VirtualRange = {
      startIndex: 0,
      endIndex: 0,
      totalHeight: 0,
      offsetTop: 0,
    };
    expect(sliceVisibleRows(rows, range)).toEqual([]);
  });

  it("returns empty array for empty rows", () => {
    const range: VirtualRange = {
      startIndex: 0,
      endIndex: 10,
      totalHeight: 500,
      offsetTop: 0,
    };
    expect(sliceVisibleRows([], range)).toEqual([]);
  });

  it("returns all rows for full range", () => {
    const rows = makeRows(10);
    const range: VirtualRange = {
      startIndex: 0,
      endIndex: 10,
      totalHeight: 500,
      offsetTop: 0,
    };
    const result = sliceVisibleRows(rows, range);
    expect(result).toHaveLength(10);
    expect(result).toEqual(rows);
  });

  it("does not mutate the original array", () => {
    const rows = makeRows(50);
    const originalLength = rows.length;
    const range: VirtualRange = {
      startIndex: 10,
      endIndex: 20,
      totalHeight: 2500,
      offsetTop: 500,
    };
    sliceVisibleRows(rows, range);
    expect(rows).toHaveLength(originalLength);
    expect(rows[0]?.index).toBe(0);
  });
});
