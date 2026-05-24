import type { Role } from "@/types";
const map: Record<Role, string> = {
  ADMIN: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  OFFICER: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  STAFF: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};
export function RoleBadge({ role }: { role: Role }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[role]}`}>{role}</span>;
}
