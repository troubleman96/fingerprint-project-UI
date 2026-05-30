import type { CaseStatus } from "@/types";

const map: Record<CaseStatus, { bg: string; text: string; dot: string; label: string; pulse?: boolean }> = {
  REPORTED:     { bg: "bg-amber-500/15",   text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", label: "Reported", pulse: true },
  UNDER_REVIEW: { bg: "bg-blue-500/15",    text: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-500", label: "Under Review", pulse: true },
  DECIDED:      { bg: "bg-violet-500/15",  text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500", label: "Decided" },
  CLOSED:       { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", label: "Closed" },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}
