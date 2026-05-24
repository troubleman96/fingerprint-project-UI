import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Avatar } from "@/components/shared/Avatar";
import { auditLog } from "@/data/mock";
import type { AuditEntry } from "@/types";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/app/audit")({ component: AuditLogPage });

function AuditLogPage() {
  const cols: Column<AuditEntry>[] = [
    { key: "timestamp", header: "Timestamp", render: (r) => <span className="font-mono text-xs">{format(parseISO(r.timestamp), "yyyy-MM-dd HH:mm:ss")}</span> },
    { key: "user", header: "User", render: (r) => <div className="flex items-center gap-2"><Avatar name={r.user} size={28} /><span className="text-sm">{r.user}</span></div> },
    { key: "action", header: "Action", render: (r) => <span className="rounded bg-blue-500/15 px-2 py-0.5 font-mono text-xs text-blue-600">{r.action}</span> },
    { key: "description", header: "Description" },
    { key: "resource_id", header: "Resource", render: (r) => <span className="font-mono text-xs">{r.resource_type} · {r.resource_id}</span> },
    { key: "ip_address", header: "IP", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ip_address}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" subtitle="Immutable record of all system actions" />
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
        <Lock className="h-4 w-4" /> This log is append-only and tamper-proof. Entries cannot be modified or deleted.
      </div>
      <DataTable data={auditLog} columns={cols} searchKeys={["user", "action", "description"]} />
    </div>
  );
}
