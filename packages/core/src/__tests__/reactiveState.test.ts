import { describe, expect, it, vi } from "vitest";
import { createGrid } from "../createGrid";
import type { ColumnDef } from "../types";

interface Person {
  name: string;
  age: number;
}

const columns: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name" as const, header: "Name" },
  { id: "age", accessorKey: "age" as const, header: "Age" },
];

const data: Person[] = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];

describe("reactive state model", () => {
  describe("getState", () => {
    it("returns current state snapshot with data, columns, and rowModel", () => {
      const grid = createGrid({ data, columns });
      const state = grid.getState();

      expect(state.data).toBe(data);
      expect(state.columns).toBe(columns);
      expect(state.rowModel).toHaveLength(2);
      expect(state.rowModel[0]?.index).toBe(0);
      expect(state.rowModel[0]?.original).toEqual({ name: "Alice", age: 30 });
    });

    it("returns a consistent snapshot (same reference until state changes)", () => {
      const grid = createGrid({ data, columns });
      const state1 = grid.getState();
      const state2 = grid.getState();

      expect(state1).toBe(state2);
    });
  });

  describe("subscribe / unsubscribe", () => {
    it("calls listener synchronously when state changes via setData", () => {
      const grid = createGrid({ data, columns });
      const listener = vi.fn();

      grid.subscribe(listener);
      grid.setData([{ name: "Carol", age: 35 }]);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("calls listener synchronously when state changes via setColumns", () => {
      const grid = createGrid({ data, columns });
      const listener = vi.fn();

      grid.subscribe(listener);
      grid.setColumns([{ id: "name", accessorKey: "name" as const, header: "Full Name" }]);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("calls listener synchronously when state changes via setState", () => {
      const grid = createGrid({ data, columns });
      const listener = vi.fn();

      grid.subscribe(listener);
      grid.setState((prev) => ({ columns: prev.columns }));

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("supports multiple subscribers", () => {
      const grid = createGrid({ data, columns });
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      grid.subscribe(listener1);
      grid.subscribe(listener2);
      grid.subscribe(listener3);

      grid.setData([{ name: "Dave", age: 40 }]);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it("unsubscribe stops notifications for that listener", () => {
      const grid = createGrid({ data, columns });
      const listener = vi.fn();

      const unsubscribe = grid.subscribe(listener);
      grid.setData([{ name: "Carol", age: 35 }]);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      grid.setData([{ name: "Dave", age: 40 }]);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("unsubscribe only affects the specific listener", () => {
      const grid = createGrid({ data, columns });
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = grid.subscribe(listener1);
      grid.subscribe(listener2);

      unsub1();
      grid.setData([{ name: "Eve", age: 28 }]);

      expect(listener1).toHaveBeenCalledTimes(0);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("double unsubscribe is safe (no error)", () => {
      const grid = createGrid({ data, columns });
      const listener = vi.fn();

      const unsubscribe = grid.subscribe(listener);
      unsubscribe();
      unsubscribe();

      grid.setData([{ name: "Frank", age: 45 }]);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("setData", () => {
    it("replaces data and recomputes the row model", () => {
      const grid = createGrid({ data, columns });
      const newData = [{ name: "Carol", age: 35 }];

      grid.setData(newData);

      expect(grid.getState().data).toBe(newData);
      expect(grid.getRows()).toHaveLength(1);
      expect(grid.getRows()[0]?.index).toBe(0);
      expect(grid.getRows()[0]?.original).toEqual({ name: "Carol", age: 35 });
    });

    it("notifies subscribers after updating", () => {
      const grid = createGrid({ data, columns });
      const states: Person[][] = [];

      grid.subscribe(() => {
        states.push(grid.getState().data);
      });

      const newData = [{ name: "Carol", age: 35 }];
      grid.setData(newData);

      expect(states).toHaveLength(1);
      expect(states[0]).toBe(newData);
    });

    it("updates the data property on the grid instance", () => {
      const grid = createGrid({ data, columns });
      const newData = [{ name: "Carol", age: 35 }];

      grid.setData(newData);

      expect(grid.data).toBe(newData);
    });
  });

  describe("setColumns", () => {
    it("replaces columns and notifies subscribers", () => {
      const grid = createGrid({ data, columns });
      const newColumns: ColumnDef<Person>[] = [
        { id: "name", accessorKey: "name" as const, header: "Full Name" },
      ];
      const listener = vi.fn();

      grid.subscribe(listener);
      grid.setColumns(newColumns);

      expect(grid.getState().columns).toBe(newColumns);
      expect(grid.columns).toBe(newColumns);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not recompute row model when only columns change", () => {
      const grid = createGrid({ data, columns });
      const rowModelBefore = grid.getRows();

      grid.setColumns([{ id: "name", accessorKey: "name" as const, header: "Full Name" }]);

      expect(grid.getRows()).toBe(rowModelBefore);
    });
  });

  describe("setState", () => {
    it("merges partial state and notifies subscribers", () => {
      const grid = createGrid({ data, columns });
      const listener = vi.fn();

      grid.subscribe(listener);
      const newColumns: ColumnDef<Person>[] = [
        { id: "age", accessorKey: "age" as const, header: "Years" },
      ];
      grid.setState(() => ({ columns: newColumns }));

      expect(grid.getState().columns).toBe(newColumns);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("recomputes row model when data is changed via setState", () => {
      const grid = createGrid({ data, columns });
      const newData = [{ name: "Zara", age: 22 }];

      grid.setState(() => ({ data: newData }));

      expect(grid.getState().data).toBe(newData);
      expect(grid.getRows()).toHaveLength(1);
      expect(grid.getRows()[0]?.index).toBe(0);
      expect(grid.getRows()[0]?.original).toEqual({ name: "Zara", age: 22 });
    });

    it("receives previous state in the updater function", () => {
      const grid = createGrid({ data, columns });
      const captured: unknown[] = [];

      grid.setState((prev) => {
        captured.push(prev);
        return {};
      });

      expect(captured).toHaveLength(1);
      expect((captured[0] as { data: Person[] }).data).toBe(data);
    });
  });

  describe("getRows caching", () => {
    it("returns the same array reference on repeated calls (cached)", () => {
      const grid = createGrid({ data, columns });
      const rows1 = grid.getRows();
      const rows2 = grid.getRows();

      expect(rows1).toBe(rows2);
    });

    it("returns a new array reference after setData", () => {
      const grid = createGrid({ data, columns });
      const rowsBefore = grid.getRows();

      grid.setData([...data]);
      const rowsAfter = grid.getRows();

      expect(rowsBefore).not.toBe(rowsAfter);
    });

    it("returns the same reference after setColumns (no data change)", () => {
      const grid = createGrid({ data, columns });
      const rowsBefore = grid.getRows();

      grid.setColumns([...columns]);
      const rowsAfter = grid.getRows();

      expect(rowsBefore).toBe(rowsAfter);
    });
  });
});
