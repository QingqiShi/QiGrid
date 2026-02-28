import { describe, expect, it } from "vitest";
import { computeNextFocus } from "./navigation";

describe("computeNextFocus", () => {
  const rows = 10;
  const cols = 5;

  describe("arrow directions on a 10×5 grid", () => {
    it("up moves row up by 1", () => {
      expect(computeNextFocus({ rowIndex: 5, columnIndex: 2 }, "up", rows, cols)).toEqual({
        rowIndex: 4,
        columnIndex: 2,
      });
    });

    it("down moves row down by 1", () => {
      expect(computeNextFocus({ rowIndex: 5, columnIndex: 2 }, "down", rows, cols)).toEqual({
        rowIndex: 6,
        columnIndex: 2,
      });
    });

    it("left moves column left by 1", () => {
      expect(computeNextFocus({ rowIndex: 5, columnIndex: 2 }, "left", rows, cols)).toEqual({
        rowIndex: 5,
        columnIndex: 1,
      });
    });

    it("right moves column right by 1", () => {
      expect(computeNextFocus({ rowIndex: 5, columnIndex: 2 }, "right", rows, cols)).toEqual({
        rowIndex: 5,
        columnIndex: 3,
      });
    });
  });

  describe("boundary clamping", () => {
    it("up from row 0 stays at row 0", () => {
      expect(computeNextFocus({ rowIndex: 0, columnIndex: 2 }, "up", rows, cols)).toEqual({
        rowIndex: 0,
        columnIndex: 2,
      });
    });

    it("down from last row stays at last row", () => {
      expect(computeNextFocus({ rowIndex: 9, columnIndex: 2 }, "down", rows, cols)).toEqual({
        rowIndex: 9,
        columnIndex: 2,
      });
    });

    it("left from col 0 stays at col 0", () => {
      expect(computeNextFocus({ rowIndex: 5, columnIndex: 0 }, "left", rows, cols)).toEqual({
        rowIndex: 5,
        columnIndex: 0,
      });
    });

    it("right from last col stays at last col", () => {
      expect(computeNextFocus({ rowIndex: 5, columnIndex: 4 }, "right", rows, cols)).toEqual({
        rowIndex: 5,
        columnIndex: 4,
      });
    });
  });

  describe("home/end", () => {
    it("home moves to first column", () => {
      expect(computeNextFocus({ rowIndex: 3, columnIndex: 3 }, "home", rows, cols)).toEqual({
        rowIndex: 3,
        columnIndex: 0,
      });
    });

    it("end moves to last column", () => {
      expect(computeNextFocus({ rowIndex: 3, columnIndex: 1 }, "end", rows, cols)).toEqual({
        rowIndex: 3,
        columnIndex: 4,
      });
    });

    it("home from col 0 stays at col 0", () => {
      expect(computeNextFocus({ rowIndex: 3, columnIndex: 0 }, "home", rows, cols)).toEqual({
        rowIndex: 3,
        columnIndex: 0,
      });
    });

    it("end from last col stays at last col", () => {
      expect(computeNextFocus({ rowIndex: 3, columnIndex: 4 }, "end", rows, cols)).toEqual({
        rowIndex: 3,
        columnIndex: 4,
      });
    });
  });

  describe("pageUp/pageDown", () => {
    const pageSize = 3;

    it("pageDown moves down by pageSize", () => {
      expect(
        computeNextFocus({ rowIndex: 2, columnIndex: 1 }, "pageDown", rows, cols, pageSize),
      ).toEqual({
        rowIndex: 5,
        columnIndex: 1,
      });
    });

    it("pageUp moves up by pageSize", () => {
      expect(
        computeNextFocus({ rowIndex: 5, columnIndex: 1 }, "pageUp", rows, cols, pageSize),
      ).toEqual({
        rowIndex: 2,
        columnIndex: 1,
      });
    });

    it("pageDown clamps to last row", () => {
      expect(
        computeNextFocus({ rowIndex: 8, columnIndex: 1 }, "pageDown", rows, cols, pageSize),
      ).toEqual({
        rowIndex: 9,
        columnIndex: 1,
      });
    });

    it("pageUp clamps to row 0", () => {
      expect(
        computeNextFocus({ rowIndex: 1, columnIndex: 1 }, "pageUp", rows, cols, pageSize),
      ).toEqual({
        rowIndex: 0,
        columnIndex: 1,
      });
    });

    it("pageUp/pageDown without pageSize defaults to 1", () => {
      expect(computeNextFocus({ rowIndex: 5, columnIndex: 1 }, "pageDown", rows, cols)).toEqual({
        rowIndex: 6,
        columnIndex: 1,
      });
      expect(computeNextFocus({ rowIndex: 5, columnIndex: 1 }, "pageUp", rows, cols)).toEqual({
        rowIndex: 4,
        columnIndex: 1,
      });
    });
  });

  describe("edge case: 1×1 grid", () => {
    it("all directions stay at (0,0)", () => {
      const directions = [
        "up",
        "down",
        "left",
        "right",
        "home",
        "end",
        "pageUp",
        "pageDown",
      ] as const;
      for (const dir of directions) {
        expect(computeNextFocus({ rowIndex: 0, columnIndex: 0 }, dir, 1, 1)).toEqual({
          rowIndex: 0,
          columnIndex: 0,
        });
      }
    });
  });
});
