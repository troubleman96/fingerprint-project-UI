import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, FolderOpen, AlertTriangle, CheckCircle2, Search, FileText, BarChart3, Fingerprint } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { Avatar } from "@/components/shared/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import { reportsApi } from "@/api/reports";
import { casesApi } from "@/api/cases";
import { auditApi } from "@/api/audit";
import type { CaseListItem } from "@/types";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/app/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: reportsApi.dashboard,
    staleTime: 60_000,
  });

  const { data: casesRes, isLoading: casesLoading } = useQuery({
    queryKey: ["cases", { page_size: 8, ordering: "-created_at" }],
    queryFn: () => casesApi.list({ page_size: 8, ordering: "-created_at" }),
    staleTime: 30_000,
  });

  const { data: auditRes } = useQuery({
    queryKey: ["audit", { page_size: 5 }],
    queryFn: () => auditApi.list({ page_size: 5 }),
    staleTime: 30_000,
  });

  const recent = casesRes?.data ?? [];
  type Row = CaseListItem;

  const cols: Column<Row>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.student.full_name} />
          <div>
            <p className="text-sm font-medium">{r.student.full_name}</p>
            <p className="text-xs text-muted-foreground font-mono">{r.student.reg_number}</p>
          </div>
        </div>
      ),
    },
    { key: "case_number", header: "Case ID", render: (r) => <span className="font-mono text-sm text-blue-600 dark:text-blue-400">#{r.case_number}</span> },
    { key: "incident_type_name", header: "Incident" },
    { key: "severity", header: "Severity", render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "date_of_incident", header: "Date", render: (r) => format(parseISO(r.date_of_incident), "dd MMM yyyy") },
  ];

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const hl = stats?.headline;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard color="blue" label="Total Students" value={(hl?.total_students ?? 0).toLocaleString()} icon={<Users className="h-5 w-5" />} />
        <StatCard color="amber" label="Open Cases" value={hl?.open_cases ?? 0} delta={`+${hl?.new_this_week ?? 0} this week`} deltaColor="red" icon={<FolderOpen className="h-5 w-5" />} />
        <StatCard color="red" label="Critical Cases" value={hl?.critical_cases ?? 0} delta="Requires attention" deltaColor="red" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard color="green" label="Resolved This Month" value={hl?.resolved_this_month ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Recent Disciplinary Cases</h3>
            <Link to="/app/cases" className="text-sm text-blue-600 hover:underline">View all →</Link>
          </div>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
            </TabsList>
          </Tabs>
          {casesLoading
            ? <Skeleton className="h-40 w-full" />
            : <DataTable data={recent} columns={cols} searchable={false} pageSize={8} onRowClick={(r) => navigate({ to: "/app/cases/$id", params: { id: r.id } })} />
          }
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Cases This Semester</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthly_trend ?? []}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="oklch(0.55 0.22 264)">
                    <LabelList dataKey="count" position="top" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Recent Activity</h3>
              <Link to="/app/audit" className="text-xs text-blue-600 hover:underline">Audit log →</Link>
            </div>
            <ul className="space-y-3 text-sm">
              {(auditRes?.data ?? []).map((entry, i) => (
                <li key={entry.id} className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-red-500", "bg-violet-500"][i % 5]}`} />
                  <div className="flex-1">
                    <p><span className="font-semibold">{entry.user_name}</span> {entry.description.toLowerCase()}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(entry.timestamp), "d MMM, HH:mm")}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => navigate({ to: "/app/students" })}><Search className="h-4 w-4" /> Lookup</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => navigate({ to: "/app/cases/new" })}><FileText className="h-4 w-4" /> New Case</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => navigate({ to: "/app/reports" })}><BarChart3 className="h-4 w-4" /> Reports</Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => navigate({ to: "/app/biometric/enroll" })}><Fingerprint className="h-4 w-4" /> Enroll</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
