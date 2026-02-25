import { describe, expect, it } from "vitest";
import {
  cellCoordsEqual,
  clampCell,
  getCellRangeEdges,
  isCellInRange,
  isCellInRanges,
  normalizeRange,
  rangesEqual,
  serializeRangeToTSV,
} from "../selection";

describe("normalizeRange", () => {
  it("returns unchanged when start <= end", () => {
    const range = { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 2, columnIndex: 3 } };
    expect(normalizeRange(range)).toEqual(range);
  });

  it("swaps when start > end", () => {
    const range = { start: { rowIndex: 5, columnIndex: 4 }, end: { rowIndex: 1, columnIndex: 2 } };
    expect(normalizeRange(range)).toEqual({
      start: { rowIndex: 1, columnIndex: 2 },
      end: { rowIndex: 5, columnIndex: 4 },
    });
  });

  it("handles mixed ordering (row ascending, col descending)", () => {
    const range = { start: { rowIndex: 1, columnIndex: 5 }, end: { rowIndex: 3, columnIndex: 2 } };
    expect(normalizeRange(range)).toEqual({
      start: { rowIndex: 1, columnIndex: 2 },
      end: { rowIndex: 3, columnIndex: 5 },
    });
  });

  it("handles single cell range", () => {
    const range = { start: { rowIndex: 2, columnIndex: 3 }, end: { rowIndex: 2, columnIndex: 3 } };
    expect(normalizeRange(range)).toEqual(range);
  });
});

describe("isCellInRange", () => {
  const range = { start: { rowIndex: 1, columnIndex: 1 }, end: { rowIndex: 3, columnIndex: 4 } };

  it("returns true for cell inside range", () => {
    expect(isCellInRange({ rowIndex: 2, columnIndex: 2 }, range)).toBe(true);
  });

  it("returns true for cell on boundary", () => {
    expect(isCellInRange({ rowIndex: 1, columnIndex: 1 }, range)).toBe(true);
    expect(isCellInRange({ rowIndex: 3, columnIndex: 4 }, range)).toBe(true);
    expect(isCellInRange({ rowIndex: 1, columnIndex: 4 }, range)).toBe(true);
    expect(isCellInRange({ rowIndex: 3, columnIndex: 1 }, range)).toBe(true);
  });

  it("returns false for cell outside range", () => {
    expect(isCellInRange({ rowIndex: 0, columnIndex: 2 }, range)).toBe(false);
    expect(isCellInRange({ rowIndex: 4, columnIndex: 2 }, range)).toBe(false);
    expect(isCellInRange({ rowIndex: 2, columnIndex: 0 }, range)).toBe(false);
    expect(isCellInRange({ rowIndex: 2, columnIndex: 5 }, range)).toBe(false);
  });

  it("works with reversed range (auto-normalizes)", () => {
    const reversed = {
      start: { rowIndex: 3, columnIndex: 4 },
      end: { rowIndex: 1, columnIndex: 1 },
    };
    expect(isCellInRange({ rowIndex: 2, columnIndex: 2 }, reversed)).toBe(true);
  });
});

describe("isCellInRanges", () => {
  it("returns true if cell is in any range", () => {
    const ranges = [
      { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 1, columnIndex: 1 } },
      { start: { rowIndex: 5, columnIndex: 5 }, end: { rowIndex: 6, columnIndex: 6 } },
    ];
    expect(isCellInRanges({ rowIndex: 0, columnIndex: 0 }, ranges)).toBe(true);
    expect(isCellInRanges({ rowIndex: 5, columnIndex: 5 }, ranges)).toBe(true);
  });

  it("returns false if cell is in no range", () => {
    const ranges = [
      { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 1, columnIndex: 1 } },
    ];
    expect(isCellInRanges({ rowIndex: 3, columnIndex: 3 }, ranges)).toBe(false);
  });

  it("returns false for empty ranges array", () => {
    expect(isCellInRanges({ rowIndex: 0, columnIndex: 0 }, [])).toBe(false);
  });
});

describe("clampCell", () => {
  it("returns same cell when in bounds", () => {
    expect(clampCell({ rowIndex: 2, columnIndex: 3 }, 10, 5)).toEqual({
      rowIndex: 2,
      columnIndex: 3,
    });
  });

  it("clamps negative indices to 0", () => {
    expect(clampCell({ rowIndex: -1, columnIndex: -5 }, 10, 5)).toEqual({
      rowIndex: 0,
      columnIndex: 0,
    });
  });

  it("clamps above max to last valid index", () => {
    expect(clampCell({ rowIndex: 100, columnIndex: 50 }, 10, 5)).toEqual({
      rowIndex: 9,
      columnIndex: 4,
    });
  });
});

describe("cellCoordsEqual", () => {
  it("returns true for identical coords", () => {
    expect(cellCoordsEqual({ rowIndex: 1, columnIndex: 2 }, { rowIndex: 1, columnIndex: 2 })).toBe(
      true,
    );
  });

  it("returns false for different coords", () => {
    expect(cellCoordsEqual({ rowIndex: 1, columnIndex: 2 }, { rowIndex: 1, columnIndex: 3 })).toBe(
      false,
    );
  });

  it("returns true for two nulls", () => {
    expect(cellCoordsEqual(null, null)).toBe(true);
  });

  it("returns false for null vs non-null", () => {
    expect(cellCoordsEqual(null, { rowIndex: 0, columnIndex: 0 })).toBe(false);
    expect(cellCoordsEqual({ rowIndex: 0, columnIndex: 0 }, null)).toBe(false);
  });
});

describe("rangesEqual", () => {
  it("returns true for identical range arrays", () => {
    const ranges = [
      { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 1, columnIndex: 1 } },
    ];
    expect(rangesEqual(ranges, [...ranges])).toBe(true);
  });

  it("returns false for different lengths", () => {
    expect(
      rangesEqual(
        [],
        [{ start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 0, columnIndex: 0 } }],
      ),
    ).toBe(false);
  });

  it("returns true for same reference", () => {
    const ranges = [
      { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 1, columnIndex: 1 } },
    ];
    expect(rangesEqual(ranges, ranges)).toBe(true);
  });
});

describe("getCellRangeEdges", () => {
  const range = { start: { rowIndex: 1, columnIndex: 1 }, end: { rowIndex: 3, columnIndex: 3 } };

  it("top-left corner has top and left edges", () => {
    expect(getCellRangeEdges({ rowIndex: 1, columnIndex: 1 }, [range])).toEqual({
      top: true,
      right: false,
      bottom: false,
      left: true,
    });
  });

  it("bottom-right corner has bottom and right edges", () => {
    expect(getCellRangeEdges({ rowIndex: 3, columnIndex: 3 }, [range])).toEqual({
      top: false,
      right: true,
      bottom: true,
      left: false,
    });
  });

  it("interior cell has no edges", () => {
    expect(getCellRangeEdges({ rowIndex: 2, columnIndex: 2 }, [range])).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: false,
    });
  });

  it("cell outside range has no edges", () => {
    expect(getCellRangeEdges({ rowIndex: 5, columnIndex: 5 }, [range])).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: false,
    });
  });
});

describe("serializeRangeToTSV", () => {
  const mockRows = [
    { getValue: (id: string) => ({ a: "A0", b: "B0" })[id] },
    { getValue: (id: string) => ({ a: "A1", b: "B1" })[id] },
    { getValue: (id: string) => ({ a: "A2", b: "B2" })[id] },
  ];
  const columnIds = ["a", "b"];

  it("serializes a single cell", () => {
    const range = { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 0, columnIndex: 0 } };
    expect(serializeRangeToTSV(mockRows, columnIds, range)).toBe("A0");
  });

  it("serializes a range", () => {
    const range = { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 1, columnIndex: 1 } };
    expect(serializeRangeToTSV(mockRows, columnIds, range)).toBe("A0\tB0\nA1\tB1");
  });

  it("handles null values", () => {
    const rows = [{ getValue: () => null }];
    const range = { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 0, columnIndex: 0 } };
    expect(serializeRangeToTSV(rows, ["x"], range)).toBe("");
  });
});
