import type { ReactNode } from "react";
export function EmptyState({ icon, title, subtitle, action }: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle && <p className="max-w-md text-sm text-muted-foreground">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
