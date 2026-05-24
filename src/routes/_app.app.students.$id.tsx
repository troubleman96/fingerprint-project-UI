import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Fingerprint, FileText, UserX, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar } from "@/components/shared/Avatar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { students, cases } from "@/data/mock";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/app/students/$id")({ component: StudentDetailPage });

function StudentDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const s = students.find((x) => x.id === Number(id));
  if (!s) return <EmptyState title="Student not found" />;
  const sCases = cases.filter((c) => c.student_id === s.id);

  const cols: Column<typeof sCases[number]>[] = [
    { key: "case_number", header: "Case ID", render: (c) => <span className="font-mono text-blue-600">#{c.case_number}</span> },
    { key: "incident_type", header: "Type" },
    { key: "severity", header: "Severity", render: (c) => <SeverityBadge severity={c.severity} /> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { key: "date_of_incident", header: "Date", render: (c) => format(parseISO(c.date_of_incident), "dd MMM yyyy") },
  ];

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground"><Link to="/app/students" className="hover:text-foreground">Students</Link><ChevronRight className="h-3 w-3" /><span>{s.first_name} {s.last_name}</span></nav>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
            <Avatar name={`${s.first_name} ${s.last_name}`} size={64} />
            <div className="flex-1">
              <h2 className="text-xl font-bold">{s.first_name} {s.last_name}</h2>
              <p className="font-mono text-sm text-muted-foreground">{s.reg_number}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-600">{s.department}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.biometric_enrolled ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>{s.biometric_enrolled ? "Biometric ✓" : "Not enrolled"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
              <Button variant="outline" size="sm" className="gap-1"><Fingerprint className="h-3.5 w-3.5" /> Enroll</Button>
              <Button size="sm" className="gap-1" onClick={() => navigate({ to: "/app/cases/new" })}><FileText className="h-3.5 w-3.5" /> File Case</Button>
              <Button variant="destructive" size="sm" className="gap-1"><UserX className="h-3.5 w-3.5" /> Deactivate</Button>
            </div>
          </div>
          <Tabs defaultValue="cases">
            <TabsList>
              <TabsTrigger value="cases">Cases</TabsTrigger>
              <TabsTrigger value="docs">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="cases" className="pt-4">
              {sCases.length ? <DataTable data={sCases} columns={cols} searchable={false} onRowClick={(c) => navigate({ to: "/app/cases/$id", params: { id: String(c.id) } })} /> : <EmptyState title="No cases on file" subtitle="This student has a clean record." />}
            </TabsContent>
            <TabsContent value="docs" className="pt-4"><EmptyState title="No documents on file" /></TabsContent>
            <TabsContent value="notes" className="pt-4"><EmptyState title="No internal notes yet" /></TabsContent>
            <TabsContent value="activity" className="pt-4"><EmptyState title="No activity recorded" /></TabsContent>
          </Tabs>
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
            <h3 className="mb-3 text-sm font-semibold">Student Details</h3>
            <dl className="space-y-2">
              {[["Reg No.", s.reg_number], ["Department", s.department], ["Year", s.academic_year], ["Level", s.level || "—"], ["Gender", s.gender || "—"], ["Phone", s.phone || "—"], ["Email", s.email || "—"], ["Registered", format(parseISO(s.created_at), "dd MMM yyyy")]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
            <h3 className="mb-3 text-sm font-semibold">Biometric Status</h3>
            <p>Status: <span className={s.biometric_enrolled ? "text-emerald-600" : "text-amber-600"}>{s.biometric_enrolled ? "Enrolled" : "Not enrolled"}</span></p>
            <p className="text-muted-foreground">Finger: right_index</p>
            <p className="text-muted-foreground">Last verified: 14 May 2024</p>
            <Button size="sm" variant="outline" className="mt-3 w-full">Re-enroll</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
