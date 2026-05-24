import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, BarChart, Bar, Legend } from "recharts";
import { dashboardStats, students, cases, incidentTypes } from "@/data/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/reports")({ component: ReportsPage });

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function ReportsPage() {
  const byType = incidentTypes.map((t) => ({ name: t.name, value: cases.filter((c) => c.incident_type === t.name).length }));
  const repeat = students.filter((s) => s.case_count >= 2).sort((a, b) => b.case_count - a.case_count);

  const cols: Column<typeof repeat[number]>[] = [
    { key: "name", header: "Student", render: (s) => `${s.first_name} ${s.last_name}` },
    { key: "reg_number", header: "Reg No.", render: (s) => <span className="font-mono">{s.reg_number}</span> },
    { key: "department", header: "Department" },
    { key: "case_count", header: "Cases", render: (s) => <span className="font-semibold">{s.case_count}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Reports & Analytics" subtitle="Statistical analysis and export tools" actions={<>
        <Button variant="outline" className="gap-2" onClick={() => toast.info("PDF export started")}><Download className="h-4 w-4" /> Export PDF</Button>
        <Button className="gap-2" onClick={() => toast.info("CSV export started")}><FileText className="h-4 w-4" /> Export CSV</Button>
      </>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard color="blue" label="Total Cases" value={cases.length} />
        <StatCard color="amber" label="Open" value={dashboardStats.open_cases} />
        <StatCard color="red" label="High Severity" value={cases.filter((c) => c.severity === "HIGH").length} />
        <StatCard color="green" label="Resolved" value={dashboardStats.resolved_this_month} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Cases by Incident Type</h3>
          <div className="h-56"><ResponsiveContainer><PieChart><Pie data={byType} dataKey="value" innerRadius={40} outerRadius={70}>{byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Monthly Trend</h3>
          <div className="h-56"><ResponsiveContainer><AreaChart data={dashboardStats.monthly_trend}><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Area dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} /></AreaChart></ResponsiveContainer></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">By Department</h3>
          <div className="h-56"><ResponsiveContainer><BarChart data={dashboardStats.top_departments} layout="vertical"><XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" fontSize={10} width={100} /><Tooltip /><Bar dataKey="case_count" fill="#3b82f6" radius={4} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Status Distribution</h3>
        <div className="h-64"><ResponsiveContainer><BarChart data={dashboardStats.monthly_trend}><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend /><Bar dataKey="count" stackId="a" fill="#f59e0b" name="Reported" /></BarChart></ResponsiveContainer></div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Repeat Offenders (2+ Cases)</h3>
        <DataTable data={repeat} columns={cols} searchable={false} />
      </div>
    </div>
  );
}
