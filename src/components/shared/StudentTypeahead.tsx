import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { studentsApi } from "@/api/students";
import type { StudentListItem } from "@/types";

export interface StudentTypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (student: StudentListItem) => void;
  placeholder?: string;
}

/** Live search-as-you-type over students, with a "Create Student" fallback when nothing matches. */
export function StudentTypeahead({ value, onChange, onSelect, placeholder }: StudentTypeaheadProps) {
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 250);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const query = debounced.trim();
  const { data, isFetching } = useQuery({
    queryKey: ["students-typeahead", query],
    queryFn: () => studentsApi.list({ search: query, page_size: 6 }),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });

  const results = query.length >= 2 ? (data?.data ?? []) : [];
  const showNoResults = query.length >= 2 && !isFetching && results.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={value}
          placeholder={placeholder ?? "Search by name or registration number…"}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          {isFetching && (
            <div className="px-3 py-2.5 text-sm text-muted-foreground">Searching…</div>
          )}

          {!isFetching && results.map((s) => (
            <button
              key={s.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
              onClick={() => { onSelect(s); setOpen(false); }}
            >
              <span>
                <span className="font-medium">{s.full_name}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">{s.reg_number}</span>
              </span>
              <span className="text-xs text-muted-foreground">{s.department_name}</span>
            </button>
          ))}

          {showNoResults && (
            <div className="space-y-2 px-3 py-3 text-sm">
              <p className="text-muted-foreground">No student found for "{query}".</p>
              <Link
                to="/app/students/new"
                search={{ reg_number: query }}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <UserPlus className="h-3.5 w-3.5" /> Create Student "{query}"
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
