import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users, FolderOpen, AlertTriangle, CheckCircle2, Search, FileText, BarChart3, Fingerprint } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { Avatar } from "@/components/shared/Avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import { cases, students, dashboardStats } from "@/data/mock";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/app/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const navigate = useNavigate();
  const recent = cases.slice(0, 8).map((c) => ({ ...c, student: students.find((s) => s.id === c.student_id)! }));
  type Row = typeof recent[number];

  const cols: Column<Row>[] = [
    { key: "student", header: "Student", render: (r) => (
      <div className="flex items-center gap-3"><Avatar name={`${r.student.first_name} ${r.student.last_name}`} />
        <div><p className="text-sm font-medium">{r.student.first_name} {r.student.last_name}</p>
        <p className="text-xs text-muted-foreground font-mono">{r.student.reg_number}</p></div></div>
    )},
    { key: "case_number", header: "Case ID", render: (r) => <span className="font-mono text-sm text-blue-600 dark:text-blue-400">#{r.case_number}</span> },
    { key: "incident_type", header: "Incident" },
    { key: "severity", header: "Severity", render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "date_of_incident", header: "Date", render: (r) => format(parseISO(r.date_of_incident), "dd MMM yyyy") },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard color="blue" label="Total Students" value={dashboardStats.total_students.toLocaleString()} delta="+142 enrolled, Sem 1" deltaColor="green" icon={<Users className="h-5 w-5" />} />
        <StatCard color="amber" label="Open Cases" value={dashboardStats.open_cases} delta="+7 since last week" deltaColor="red" icon={<FolderOpen className="h-5 w-5" />} />
        <StatCard color="red" label="Critical / Escalated" value={dashboardStats.critical_cases} delta="Requires immediate action" deltaColor="red" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard color="green" label="Resolved This Month" value={dashboardStats.resolved_this_month} delta="↑ 18% vs last month" deltaColor="green" icon={<CheckCircle2 className="h-5 w-5" />} />
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
              <TabsTrigger value="review">Under Review</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>
          <DataTable data={recent} columns={cols} searchable={false} pageSize={8} onRowClick={(r) => navigate({ to: "/app/cases/$id", params: { id: String(r.id) } })} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Cases This Semester</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardStats.monthly_trend}>
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
              {[
                { c: "bg-red-500", t: "Khalfan M.", a: "escalated case #DIT-2024-0441", w: "2 min ago" },
                { c: "bg-emerald-500", t: "Amina R.", a: "resolved case #DIT-2024-0438", w: "1 hr ago" },
                { c: "bg-blue-500", t: "Zawadi A.", a: "enrolled biometric for student", w: "3 hr ago" },
                { c: "bg-amber-500", t: "Juma M.", a: "filed new case #DIT-2024-0442", w: "5 hr ago" },
                { c: "bg-violet-500", t: "System", a: "exported monthly report", w: "yesterday" },
              ].map((x, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${x.c}`} />
                  <div className="flex-1"><p><span className="font-semibold">{x.t}</span> {x.a}</p><p className="text-xs text-muted-foreground">{x.w}</p></div>
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
