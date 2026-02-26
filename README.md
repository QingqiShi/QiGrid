# QiGrid

A headless, React-idiomatic data grid engine. QiGrid provides the data layer, state coordination, and performance primitives for complex grids — you bring your own markup and styles.

## Try it

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173 — a playground with 10k rows, sorting, filtering, column resizing, and cell selection.

## Features

- **Headless** — no opinions on DOM structure or styling
- **Sorting** — single and multi-column, custom comparators, cycle toggle (asc → desc → none)
- **Filtering** — column filters with AND logic, custom filter functions
- **Row virtualization** — smooth scrolling at 100k+ rows with configurable overscan
- **Column resizing** — drag to resize with min/max constraints
- **Cell selection** — click, Shift+click range selection, Ctrl/Cmd+click multi-range, keyboard navigation
- **Clipboard** — Ctrl/Cmd+C copies selected ranges as TSV
- **Zero dependencies** — React is the sole peer dependency

## Packages

| Package | Description |
|---|---|
| `@qigrid/core` | Stateless pure functions — sorting, filtering, virtualization, selection utilities |
| `@qigrid/react` | React bindings — `useGrid` hook and `VirtualGrid` component |

## Quick start

```tsx
import { useGrid, VirtualGrid } from "@qigrid/react";
import type { ColumnDef } from "@qigrid/react";

interface Person {
  name: string;
  age: number;
}

const data: Person[] = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];

const columns: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "age", accessorKey: "age", header: "Age" },
];

function MyGrid() {
  const grid = useGrid({ data, columns });

  return (
    <VirtualGrid
      rows={grid.rows}
      columns={grid.columns}
      totalWidth={grid.totalWidth}
      rowHeight={36}
      containerHeight={400}
      renderCell={(row, col) => <span>{String(row.getValue(col.id))}</span>}
      renderHeaderCell={(col) => (
        <button onClick={() => grid.toggleSort(col.id)}>
          {col.header}
        </button>
      )}
    />
  );
}
```

### Adding filtering

Pass `renderFilterCell` to enable a filter row:

```tsx
<VirtualGrid
  // ...other props
  renderFilterCell={(col) => (
    <input
      placeholder={`Filter ${col.header}...`}
      onChange={(e) => grid.setColumnFilter(col.id, e.target.value)}
    />
  )}
/>
```

### Column resizing

Pass `onColumnResize` to enable drag-to-resize handles:

```tsx
<VirtualGrid
  // ...other props
  onColumnResize={grid.setColumnWidth}
/>
```

### Cell selection and keyboard navigation

Wire up the selection props for Excel-like cell selection:

```tsx
<VirtualGrid
  // ...other props
  focusedCell={grid.focusedCell}
  selectedRanges={grid.selectedRanges}
  onCellMouseDown={(coord, event) => {
    if (event.shiftKey) grid.extendSelection(coord);
    else if (event.ctrlKey || event.metaKey) grid.addRange({ start: coord, end: coord });
    else grid.selectCell(coord);
  }}
  onCellMouseEnter={(coord) => grid.extendSelection(coord)}
  onSelectionMouseUp={() => {}}
  onGridKeyDown={(event) => {
    switch (event.key) {
      case "ArrowUp": grid.moveFocus(-1, 0, event.shiftKey); break;
      case "ArrowDown": grid.moveFocus(1, 0, event.shiftKey); break;
      case "ArrowLeft": grid.moveFocus(0, -1, event.shiftKey); break;
      case "ArrowRight": grid.moveFocus(0, 1, event.shiftKey); break;
    }
  }}
/>
```

## `useGrid` API

```ts
const grid = useGrid({ data, columns });
```

**Returns:**

| Property | Type | Description |
|---|---|---|
| `rows` | `Row<TData>[]` | Filtered and sorted rows |
| `columns` | `Column<TData>[]` | Resolved column model with widths |
| `totalWidth` | `number` | Sum of all column widths |
| `sorting` | `SortingState` | Current sort state |
| `columnFilters` | `ColumnFiltersState` | Current filter state |
| `toggleSort(id)` | `(string) => void` | Cycle sort: none → asc → desc → none |
| `setSorting(state)` | `(SortingState) => void` | Replace sort state |
| `setColumnFilter(id, value)` | `(string, unknown) => void` | Set/clear a column filter |
| `setColumnFilters(filters)` | `(ColumnFiltersState) => void` | Replace all filters |
| `setColumnWidth(id, width)` | `(string, number) => void` | Set column width (clamped to min/max) |
| `focusedCell` | `CellCoord \| null` | Currently focused cell |
| `selectedRanges` | `CellRange[]` | Active selection ranges |
| `selectCell(coord)` | `(CellCoord) => void` | Focus and select a cell |
| `extendSelection(coord)` | `(CellCoord) => void` | Extend selection to target |
| `addRange(range)` | `(CellRange) => void` | Add independent selection range |
| `selectAll()` | `() => void` | Select all cells |
| `clearSelection()` | `() => void` | Clear selection |
| `moveFocus(dRow, dCol, extend?)` | `(number, number, boolean?) => void` | Move focus by delta |

## Development

### Prerequisites

- Node.js 20+
- pnpm 10+

### Setup

```sh
pnpm install
```

### Commands

```sh
pnpm turbo build        # Build all packages
pnpm turbo test         # Run unit tests
pnpm turbo lint         # Lint with Biome
pnpm turbo check        # TypeScript type checking
pnpm turbo bench        # Run benchmarks
pnpm dev                # Start playground dev server
```

### E2E tests

```sh
pnpm --filter @qigrid/playground e2e
```

### Project structure

```
qigrid/
  packages/
    core/         # Stateless pure functions (sort, filter, virtualize, selection)
    react/        # React bindings (useGrid hook, VirtualGrid component)
  apps/
    playground/   # Vite demo app with 10k rows
```

## License

MIT
