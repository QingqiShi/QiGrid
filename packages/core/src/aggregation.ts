import type { AggFunc } from "./types";

function sum(values: unknown[]): unknown {
  let total = 0;
  for (const v of values) {
    total += Number(v);
  }
  return total;
}

function avg(values: unknown[]): unknown {
  if (values.length === 0) return Number.NaN;
  let total = 0;
  for (const v of values) {
    total += Number(v);
  }
  return total / values.length;
}

function count(values: unknown[]): unknown {
  let n = 0;
  for (const v of values) {
    if (v != null) n++;
  }
  return n;
}

function min(values: unknown[]): unknown {
  if (values.length === 0) return undefined;
  let result = Number(values[0]);
  for (let i = 1; i < values.length; i++) {
    const n = Number(values[i]);
    if (n < result) result = n;
  }
  return result;
}

function max(values: unknown[]): unknown {
  if (values.length === 0) return undefined;
  let result = Number(values[0]);
  for (let i = 1; i < values.length; i++) {
    const n = Number(values[i]);
    if (n > result) result = n;
  }
  return result;
}

function first(values: unknown[]): unknown {
  return values.length > 0 ? values[0] : undefined;
}

function last(values: unknown[]): unknown {
  return values.length > 0 ? values[values.length - 1] : undefined;
}

export function resolveAggFunc(aggFunc: AggFunc): (values: unknown[]) => unknown {
  if (typeof aggFunc === "function") return aggFunc;
  switch (aggFunc) {
    case "sum":
      return sum;
    case "avg":
      return avg;
    case "count":
      return count;
    case "min":
      return min;
    case "max":
      return max;
    case "first":
      return first;
    case "last":
      return last;
  }
}
