import type { ReactNode } from "react";

export function DataTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {columns.map((c) => (
                <th
                  key={c}
                  className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
