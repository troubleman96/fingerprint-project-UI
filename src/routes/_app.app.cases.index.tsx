import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { casesApi } from "@/api/cases";
import type { CaseListItem } from "@/types";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/cases/")({ component: CaseListPage });

function CaseListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");

  const params = {
    ...(status !== "all" ? { status } : {}),
    ...(severity !== "all" ? { severity } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["cases", params],
    queryFn: () => casesApi.list({ page_size: 100, ...params }),
    staleTime: 30_000,
  });

  const cases = data?.data ?? [];

  const summary = [
    { label: "Reported", key: "REPORTED", color: "border-t-amber-500" },
    { label: "Under Review", key: "UNDER_REVIEW", color: "border-t-blue-500" },
    { label: "Decided", key: "DECIDED", color: "border-t-violet-500" },
    { label: "Closed", key: "CLOSED", color: "border-t-emerald-500" },
  ].map((s) => ({ ...s, count: cases.filter((c) => c.status === s.key).length }));

  const cols: Column<CaseListItem>[] = [
    { key: "case_number", header: "Case ID", render: (c) => <span className="font-mono text-sm text-blue-600">#{c.case_number}</span> },
    {
      key: "student",
      header: "Student",
      render: (c) => (
        <div className="flex items-center gap-2">
          <Avatar name={c.student.full_name} size={32} />
          <div>
            <p className="text-sm font-medium">{c.student.full_name}</p>
            <p className="font-mono text-xs text-muted-foreground">{c.student.reg_number}</p>
          </div>
        </div>
      ),
    },
    { key: "incident_type_name", header: "Incident" },
    { key: "severity", header: "Severity", render: (c) => <SeverityBadge severity={c.severity} /> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { key: "date_of_incident", header: "Date", render: (c) => format(parseISO(c.date_of_incident), "dd MMM yyyy") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Disciplinary Cases"
        subtitle="Track and manage all disciplinary incidents"
        actions={<>
          <Button variant="outline" className="gap-2" onClick={() => toast.info("Export started")}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button className="gap-2" onClick={() => navigate({ to: "/app/cases/new" })}><Plus className="h-4 w-4" /> New Case</Button>
        </>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className={`rounded-xl border border-border border-t-2 ${s.color} bg-card p-4`}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.count}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="REPORTED">Reported</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="DECIDED">Decided</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading
        ? <Skeleton className="h-64 w-full rounded-xl" />
        : <DataTable
            data={cases}
            columns={cols}
            searchKeys={["case_number", "incident_type_name"]}
            onRowClick={(c) => navigate({ to: "/app/cases/$id", params: { id: c.id } })}
          />
      }
    </div>
  );
}
