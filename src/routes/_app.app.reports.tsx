import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, BarChart, Bar } from "recharts";
import { reportsApi } from "@/api/reports";
import { casesApi } from "@/api/cases";
import { studentsApi } from "@/api/students";
import type { StudentListItem } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/reports")({ component: ReportsPage });

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function ReportsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: reportsApi.dashboard,
    staleTime: 60_000,
  });

  const { data: casesRes } = useQuery({
    queryKey: ["cases", { page_size: 200 }],
    queryFn: () => casesApi.list({ page_size: 200 }),
    staleTime: 60_000,
  });

  const { data: studentsRes } = useQuery({
    queryKey: ["students", { page_size: 200 }],
    queryFn: () => studentsApi.list({ page_size: 200 }),
    staleTime: 60_000,
  });

  const cases = casesRes?.data ?? [];
  const students = studentsRes?.data ?? [];

  const byType = Object.entries(
    cases.reduce<Record<string, number>>((acc, c) => {
      acc[c.incident_type_name] = (acc[c.incident_type_name] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const repeat = students.filter((s) => s.case_count >= 2).sort((a, b) => b.case_count - a.case_count);

  const cols: Column<StudentListItem>[] = [
    { key: "full_name", header: "Student" },
    { key: "reg_number", header: "Reg No.", render: (s) => <span className="font-mono">{s.reg_number}</span> },
    { key: "department_name", header: "Department" },
    { key: "case_count", header: "Cases", render: (s) => <span className="font-semibold">{s.case_count}</span> },
  ];

  if (statsLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  const hl = stats?.headline;

  const trend = (stats?.monthly_trend ?? []).map((t) => ({ ...t, label: t.month }));
  const trendYears = [...new Set(trend.map((t) => t.year))];
  if (trendYears.length > 1) {
    trend.forEach((t) => { t.label = `${t.month} '${String(t.year).slice(-2)}`; });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Statistical analysis and export tools"
        actions={<>
          <Button variant="outline" className="gap-2" onClick={() => toast.info("PDF export started")}><Download className="h-4 w-4" /> Export PDF</Button>
          <Button className="gap-2" onClick={() => toast.info("CSV export started")}><FileText className="h-4 w-4" /> Export CSV</Button>
        </>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard color="blue" label="Total Cases" value={cases.length} />
        <StatCard color="amber" label="Open" value={hl?.open_cases ?? 0} />
        <StatCard color="red" label="High Severity" value={cases.filter((c) => c.severity === "HIGH").length} />
        <StatCard color="green" label="Resolved This Month" value={hl?.resolved_this_month ?? 0} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Cases by Incident Type</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byType} dataKey="value" innerRadius={40} outerRadius={70}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Monthly Trend</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Area dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">By Department</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={stats?.top_departments ?? []} layout="vertical">
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={10} width={100} />
                <Tooltip />
                <Bar dataKey="case_count" fill="#3b82f6" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Status Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={stats?.status_breakdown ?? []}>
              <XAxis dataKey="status" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Repeat Offenders (2+ Cases)</h3>
        <DataTable data={repeat} columns={cols} searchable={false} />
      </div>
    </div>
  );
}
