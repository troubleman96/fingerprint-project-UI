import type { ReactNode } from "react";
const borders: Record<string, string> = {
  blue: "border-t-blue-500",
  amber: "border-t-amber-500",
  red: "border-t-red-500",
  green: "border-t-emerald-500",
  violet: "border-t-violet-500",
};
export function StatCard({ label, value, delta, icon, color = "blue", deltaColor }: { label: string; value: string | number; delta?: string; icon?: ReactNode; color?: keyof typeof borders; deltaColor?: "red" | "green" | "muted" }) {
  const dc = deltaColor === "red" ? "text-red-500" : deltaColor === "green" ? "text-emerald-500" : "text-muted-foreground";
  return (
    <div className={`rounded-xl border-t-2 ${borders[color]} border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {delta && <p className={`mt-1 text-xs ${dc}`}>{delta}</p>}
        </div>
        {icon && <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
}
