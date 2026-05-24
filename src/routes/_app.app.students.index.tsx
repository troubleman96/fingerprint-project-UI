import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Plus, Fingerprint } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Avatar } from "@/components/shared/Avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { students, departments } from "@/data/mock";
import type { Student } from "@/types";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/students/")({ component: StudentListPage });

function StudentListPage() {
  const navigate = useNavigate();
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [bio, setBio] = useState("all");

  const filtered = students.filter((s) =>
    (dept === "all" || s.department === dept) &&
    (status === "all" || (status === "active" ? s.is_active : !s.is_active)) &&
    (bio === "all" || (bio === "enrolled" ? s.biometric_enrolled : !s.biometric_enrolled))
  );

  const cols: Column<Student>[] = [
    { key: "student", header: "Student", render: (s) => (
      <Link to="/app/students/$id" params={{ id: String(s.id) }} className="flex items-center gap-3">
        <Avatar name={`${s.first_name} ${s.last_name}`} />
        <div><p className="font-medium">{s.first_name} {s.last_name}</p>
        <p className="font-mono text-xs text-muted-foreground">{s.reg_number}</p></div></Link>
    )},
    { key: "department", header: "Department" },
    { key: "academic_year", header: "Year" },
    { key: "biometric_enrolled", header: "Biometric", render: (s) => s.biometric_enrolled
      ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400"><Fingerprint className="h-3 w-3" /> Enrolled</span>
      : <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400"><Fingerprint className="h-3 w-3" /> Pending</span> },
    { key: "case_count", header: "Cases", render: (s) => s.case_count > 0
      ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${s.case_count >= 3 ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-muted"}`}>{s.case_count}</span>
      : <span className="text-muted-foreground">—</span> },
    { key: "is_active", header: "Status", render: (s) => <span className={`text-xs font-medium ${s.is_active ? "text-emerald-600" : "text-red-600"}`}>{s.is_active ? "Active" : "Inactive"}</span> },
    { key: "created_at", header: "Registered", render: (s) => format(parseISO(s.created_at), "dd MMM yyyy") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Students" subtitle="Manage student profiles and biometric records" actions={<>
        <Button variant="outline" className="gap-2" onClick={() => toast.info("Export started")}><Download className="h-4 w-4" /> Export CSV</Button>
        <Button className="gap-2" onClick={() => navigate({ to: "/app/students/new" })}><Plus className="h-4 w-4" /> Register Student</Button>
      </>} />
      <div className="flex flex-wrap gap-2">
        <Select value={dept} onValueChange={setDept}><SelectTrigger className="w-48"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Departments</SelectItem>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
        </Select>
        <Select value={bio} onValueChange={setBio}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Biometric</SelectItem><SelectItem value="enrolled">Enrolled</SelectItem><SelectItem value="pending">Not Enrolled</SelectItem></SelectContent>
        </Select>
      </div>
      <DataTable data={filtered} columns={cols} searchKeys={["first_name", "last_name", "reg_number"]} onRowClick={(s) => navigate({ to: "/app/students/$id", params: { id: String(s.id) } })} />
    </div>
  );
}
