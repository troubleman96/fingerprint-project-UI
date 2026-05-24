import type { CaseSeverity } from "@/types";
const map: Record<CaseSeverity, string> = {
  HIGH: "bg-red-500/15 text-red-600 dark:text-red-400",
  MEDIUM: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  LOW: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};
export function SeverityBadge({ severity }: { severity: CaseSeverity }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-xs font-bold ${map[severity]}`}>{severity}</span>;
}
