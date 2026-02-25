import type { Column, ColumnDef } from "./types";

function buildColumn<TData>(def: ColumnDef<TData>): Column<TData> {
  const { id, accessorKey, accessorFn, header } = def;

  function getValue(row: TData): unknown {
    if (accessorKey !== undefined) {
      return row[accessorKey];
    }
    if (accessorFn !== undefined) {
      return accessorFn(row);
    }
    return undefined;
  }

  return { id, accessorKey, accessorFn, header, getValue };
}

export function buildColumnModel<TData>(defs: ColumnDef<TData>[]): Column<TData>[] {
  return defs.map(buildColumn);
}
