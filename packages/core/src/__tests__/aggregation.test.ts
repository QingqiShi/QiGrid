import { describe, expect, it } from "vitest";
import { resolveAggFunc } from "../aggregation";

describe("resolveAggFunc", () => {
  it("maps 'sum' to a function", () => {
    const fn = resolveAggFunc("sum");
    expect(typeof fn).toBe("function");
  });

  it("maps 'avg' to a function", () => {
    const fn = resolveAggFunc("avg");
    expect(typeof fn).toBe("function");
  });

  it("maps 'count' to a function", () => {
    const fn = resolveAggFunc("count");
    expect(typeof fn).toBe("function");
  });

  it("maps 'min' to a function", () => {
    const fn = resolveAggFunc("min");
    expect(typeof fn).toBe("function");
  });

  it("maps 'max' to a function", () => {
    const fn = resolveAggFunc("max");
    expect(typeof fn).toBe("function");
  });

  it("maps 'first' to a function", () => {
    const fn = resolveAggFunc("first");
    expect(typeof fn).toBe("function");
  });

  it("maps 'last' to a function", () => {
    const fn = resolveAggFunc("last");
    expect(typeof fn).toBe("function");
  });

  it("passes custom function through unchanged", () => {
    const custom = (values: unknown[]) => values.length * 2;
    const fn = resolveAggFunc(custom);
    expect(fn).toBe(custom);
  });
});

describe("sum", () => {
  const sum = resolveAggFunc("sum");

  it("sums numeric values", () => {
    expect(sum([1, 2, 3, 4])).toBe(10);
  });

  it("returns 0 for empty array", () => {
    expect(sum([])).toBe(0);
  });

  it("handles single value", () => {
    expect(sum([42])).toBe(42);
  });

  it("returns NaN for non-numeric values", () => {
    expect(sum(["a", "b"])).toBeNaN();
  });
});

describe("avg", () => {
  const avg = resolveAggFunc("avg");

  it("averages numeric values", () => {
    expect(avg([2, 4, 6])).toBe(4);
  });

  it("returns NaN for empty array", () => {
    expect(avg([])).toBeNaN();
  });

  it("handles single value", () => {
    expect(avg([10])).toBe(10);
  });
});

describe("count", () => {
  const count = resolveAggFunc("count");

  it("counts non-null/undefined values", () => {
    expect(count([1, "a", true, 0])).toBe(4);
  });

  it("excludes null and undefined", () => {
    expect(count([1, null, undefined, "a"])).toBe(2);
  });

  it("returns 0 for empty array", () => {
    expect(count([])).toBe(0);
  });

  it("counts 0, empty string, and false as non-null", () => {
    expect(count([0, "", false])).toBe(3);
  });
});

describe("min", () => {
  const min = resolveAggFunc("min");

  it("returns minimum numeric value", () => {
    expect(min([5, 2, 8, 1])).toBe(1);
  });

  it("returns undefined for empty array", () => {
    expect(min([])).toBeUndefined();
  });

  it("handles single value", () => {
    expect(min([7])).toBe(7);
  });
});

describe("max", () => {
  const max = resolveAggFunc("max");

  it("returns maximum numeric value", () => {
    expect(max([5, 2, 8, 1])).toBe(8);
  });

  it("returns undefined for empty array", () => {
    expect(max([])).toBeUndefined();
  });

  it("handles single value", () => {
    expect(max([3])).toBe(3);
  });
});

describe("first", () => {
  const first = resolveAggFunc("first");

  it("returns first value", () => {
    expect(first(["a", "b", "c"])).toBe("a");
  });

  it("returns undefined for empty array", () => {
    expect(first([])).toBeUndefined();
  });
});

describe("last", () => {
  const last = resolveAggFunc("last");

  it("returns last value", () => {
    expect(last(["a", "b", "c"])).toBe("c");
  });

  it("returns undefined for empty array", () => {
    expect(last([])).toBeUndefined();
  });
});

describe("custom function", () => {
  it("receives values array", () => {
    const custom = (values: unknown[]) => values.join(",");
    const fn = resolveAggFunc(custom);
    expect(fn([1, 2, 3])).toBe("1,2,3");
  });

  it("receives empty array for empty groups", () => {
    const custom = (values: unknown[]) => values.length;
    const fn = resolveAggFunc(custom);
    expect(fn([])).toBe(0);
  });
});
