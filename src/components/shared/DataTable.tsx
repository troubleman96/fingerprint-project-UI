import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export function DataTable<T extends { id: number | string }>({
  data, columns, searchable = true, searchKeys, onRowClick, pageSize = 10, emptyTitle = "No results", emptySubtitle,
}: {
  data: T[]; columns: Column<T>[]; searchable?: boolean; searchKeys?: (keyof T)[]; onRowClick?: (row: T) => void; pageSize?: number; emptyTitle?: string; emptySubtitle?: string;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!q) return data;
    const lower = q.toLowerCase();
    return data.filter((row) => {
      // Default to searching all top-level row keys unless the caller narrows the scope.
      const keys = searchKeys ?? (Object.keys(row as any) as (keyof T)[]);
      return keys.some((k) => String((row as any)[k] ?? "").toLowerCase().includes(lower));
    });
  }, [data, q, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    // Sorting prefers an explicit accessor so callers can sort by derived values
    // instead of the rendered cell contents.
    const acc = col?.accessor ?? ((r: T) => (r as any)[sortKey]);
    return [...filtered].sort((a, b) => {
      const av = acc(a); const bv = acc(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-3">
      {searchable && (
        <div className="flex items-center justify-between gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search..." className="pl-9" />
          </div>
          <p className="text-xs text-muted-foreground">{sorted.length} results</p>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground ${c.className ?? ""}`}>
                  {c.sortable ? (
                    <button onClick={() => { setSortKey(c.key); setSortDir(sortKey === c.key && sortDir === "asc" ? "desc" : "asc"); }} className="inline-flex items-center gap-1 hover:text-foreground">
                      {c.header} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={columns.length}><EmptyState title={emptyTitle} subtitle={emptySubtitle} /></td></tr>
            ) : pageData.map((row) => (
              <tr key={row.id} onClick={() => onRowClick?.(row)} className={`border-b border-border last:border-0 ${onRowClick ? "cursor-pointer hover:bg-muted/30" : ""}`}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ""}`}>
                    {c.render ? c.render(row) : (c.accessor ? c.accessor(row) : String((row as any)[c.key] ?? ""))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
