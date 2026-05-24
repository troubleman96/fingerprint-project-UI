import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Pencil, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cases, students } from "@/data/mock";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/cases/$id")({ component: CaseDetailPage });

function CaseDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const c = cases.find((x) => x.id === Number(id));
  if (!c) return <EmptyState title="Case not found" />;
  const s = students.find((x) => x.id === c.student_id)!;
  const statusSteps = ["REPORTED", "UNDER_REVIEW", "DECIDED", "CLOSED"];
  const currIdx = statusSteps.indexOf(c.status);

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground"><Link to="/app/cases">Cases</Link><ChevronRight className="h-3 w-3" /><span className="font-mono">#{c.case_number}</span></nav>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-lg font-bold text-blue-600">#{c.case_number}</p>
            <p className="mt-1 text-sm">{c.incident_type} · {format(parseISO(c.date_of_incident), "dd MMM yyyy")}</p>
          </div>
          <Link to="/app/students/$id" params={{ id: String(s.id) }} className="flex items-center gap-3">
            <Avatar name={`${s.first_name} ${s.last_name}`} />
            <div><p className="text-sm font-medium">{s.first_name} {s.last_name}</p><p className="font-mono text-xs text-muted-foreground">{s.reg_number}</p></div>
          </Link>
          <div className="flex items-center gap-2"><SeverityBadge severity={c.severity} /><StatusBadge status={c.status} /></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
            <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Note</Button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {statusSteps.map((step, i) => (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div className={`relative h-4 w-4 rounded-full border-2 ${i <= currIdx ? "border-blue-600 bg-blue-600" : "border-muted-foreground/30"} ${i === currIdx ? "ring-4 ring-blue-500/30" : ""}`} />
              <span className={`text-xs ${i === currIdx ? "font-semibold" : "text-muted-foreground"}`}>{step.replace("_", " ")}</span>
              {i < 3 && <div className={`h-px flex-1 ${i < currIdx ? "bg-blue-600" : "bg-border"}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Incident Details</h3>
            <p className="text-sm">{c.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-muted-foreground">Location</dt><dd>{c.location}</dd></div>
              <div><dt className="text-muted-foreground">Reported By</dt><dd>{c.reported_by}</dd></div>
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Case Notes</h3>
            <EmptyState title="No notes yet" subtitle="Add the first note to start documenting." />
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Evidence Documents</h3><Button size="sm" variant="outline" className="gap-1"><Upload className="h-3.5 w-3.5" /> Upload</Button></div>
            <EmptyState title="No documents uploaded" />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
            <h3 className="mb-3 text-sm font-semibold">Case Info</h3>
            <dl className="space-y-1.5">
              {[["Case", c.case_number], ["Status", c.status], ["Severity", c.severity], ["Date", c.date_of_incident], ["Reported By", c.reported_by], ["Assigned", c.assigned_to || "Unassigned"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-mono text-xs">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Change Status</h3>
            <Select><SelectTrigger><SelectValue placeholder="Move to next status" /></SelectTrigger><SelectContent>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem><SelectItem value="DECIDED">Decided</SelectItem><SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent></Select>
            <Button className="mt-3 w-full" onClick={() => toast.success("Status updated")}>Apply</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
