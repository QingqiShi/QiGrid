import { useMemo } from "react";
import { useGrid } from "@qigrid/react";
import type { ColumnDef } from "@qigrid/react";

interface Person {
  name: string;
  age: number;
}

const data: Person[] = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
  { name: "Charlie", age: 35 },
];

const columns: ColumnDef<Person>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "age", accessorKey: "age", header: "Age" },
];

export function App() {
  const options = useMemo(() => ({ data, columns }), []);
  const grid = useGrid(options);
  const rows = grid.getRows();

  return (
    <div style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <h1>QiGrid Playground</h1>
      <p>
        Import chain verified: <code>@qigrid/react</code> &rarr;{" "}
        <code>@qigrid/core</code>
      </p>
      <table style={{ borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr>
            {grid.columns.map((col) => (
              <th
                key={col.id}
                style={{ border: "1px solid #ccc", padding: "8px 16px", textAlign: "left" }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.index}>
              {grid.columns.map((col) => (
                <td
                  key={col.id}
                  style={{ border: "1px solid #ccc", padding: "8px 16px" }}
                >
                  {col.accessorKey != null
                    ? String(row.original[col.accessorKey])
                    : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
