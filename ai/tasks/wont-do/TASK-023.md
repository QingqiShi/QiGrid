# TASK-023: Data export

**Phase:** 4 — Polish (stretch goal)
**Blocked by:** TASK-017 (export should respect grouping)

## Goal

Export the current grid data (respecting active filters, sorting, grouping) as CSV, TSV, or JSON.

## Acceptance criteria

### Core (`@qigrid/core`)

- Pure function: takes rows + columns + format → returns formatted string
- Formats: `csv`, `tsv`, `json`
- CSV/TSV: header row from column headers, data rows from cell values. Proper escaping (quotes, commas, newlines).
- JSON: array of objects keyed by column ID
- Group rows included with a group indicator (configurable or sensible default)
- Detail rows excluded by default

### Playground

- Add an "Export CSV" button that downloads a `.csv` file
- Exported file reflects current filters/sorting

### Tests

- CSV output matches expected format (headers, escaping, newlines)
- TSV output uses tabs
- JSON output is valid JSON with correct structure
- Export respects active filters (only exports visible rows)
- Export respects sorting order
- Special characters in cell values are properly escaped

### Quality gate

- `pnpm turbo build && pnpm turbo lint && pnpm turbo check && pnpm turbo test` all pass
