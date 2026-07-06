import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, CheckCircle2, XCircle, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationsApi, type SmsLogEntry } from "@/api/notifications";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/app/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sms-logs", {}],
    queryFn: () => notificationsApi.list({ page_size: 100 }),
    staleTime: 30_000,
  });

  const { data: balance } = useQuery({
    queryKey: ["sms-balance"],
    queryFn: () => notificationsApi.balance(),
    staleTime: 60_000,
  });

  const logs = data?.data ?? [];
  const sent = logs.filter((l) => l.status === "SENT").length;
  const failed = logs.filter((l) => l.status === "FAILED").length;

  const cols: Column<SmsLogEntry>[] = [
    {
      key: "created_at",
      header: "Time",
      render: (l) => <span className="font-mono text-xs">{format(parseISO(l.created_at), "yyyy-MM-dd HH:mm:ss")}</span>,
    },
    { key: "recipient", header: "Recipient", render: (l) => <span className="font-mono text-xs">{l.recipient}</span> },
    { key: "message", header: "Message", render: (l) => <span className="text-sm">{l.message}</span> },
    { key: "provider", header: "Provider" },
    {
      key: "status",
      header: "Status",
      render: (l) => {
        const cfg = {
          SENT: { icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
          FAILED: { icon: XCircle, cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
          LOGGED: { icon: FileText, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
        }[l.status];
        const Icon = cfg.icon;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${cfg.cls}`}>
            <Icon className="h-3 w-3" /> {l.status}
          </span>
        );
      },
    },
    {
      key: "error",
      header: "Detail",
      render: (l) => <span className="text-xs text-muted-foreground">{l.error || l.case_number || "—"}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle="SMS send history — student registration, case updates, and security alerts" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard color="blue" label="Total Sent" value={sent} />
        <StatCard color="red" label="Failed" value={failed} />
        <StatCard color="green" label="SendAfrica Balance" value={balance ?? "—"} />
      </div>

      {isLoading
        ? <Skeleton className="h-64 w-full rounded-xl" />
        : logs.length
          ? <DataTable data={logs} columns={cols} searchKeys={["recipient", "message", "provider"]} />
          : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8" />
              <p>No SMS notifications sent yet.</p>
            </div>
          )
      }
    </div>
  );
}
