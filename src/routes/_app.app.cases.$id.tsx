import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Pencil, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { casesApi } from "@/api/cases";
import type { CaseStatus, CaseOutcome } from "@/types";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { formatApiError, type ApiError } from "@/api/client";

export const Route = createFileRoute("/_app/app/cases/$id")({ component: CaseDetailPage });

const STATUS_STEPS: CaseStatus[] = ["REPORTED", "UNDER_REVIEW", "DECIDED", "CLOSED"];

const TRANSITIONS: Record<CaseStatus, CaseStatus | null> = {
  REPORTED: "UNDER_REVIEW",
  UNDER_REVIEW: "DECIDED",
  DECIDED: "CLOSED",
  CLOSED: null,
};

const OUTCOME_OPTIONS: CaseOutcome[] = ["CLEARED", "WARNING", "SUSPENSION", "EXPULSION", "REFERRED"];

function CaseDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteBody, setNoteBody] = useState("");
  const [nextStatus, setNextStatus] = useState<CaseStatus | "">("");
  const [outcome, setOutcome] = useState<CaseOutcome | "">("");

  const { data: c, isLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: () => casesApi.get(id),
  });

  const addNote = useMutation({
    mutationFn: (body: string) => casesApi.addNote(id, body),
    onSuccess: () => {
      setNoteBody("");
      queryClient.invalidateQueries({ queryKey: ["case", id] });
      toast.success("Note added");
    },
    onError: (e: ApiError) => toast.error(formatApiError(e)),
  });

  const uploadDoc = useMutation({
    mutationFn: (file: File) => casesApi.uploadDocument(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", id] });
      toast.success("Document uploaded");
    },
    onError: (e: ApiError) => toast.error(formatApiError(e)),
  });

  const transition = useMutation({
    mutationFn: () => {
      if (!nextStatus) throw new Error("Select a status");
      return casesApi.transition(id, {
        status: nextStatus as CaseStatus,
        outcome: outcome ? (outcome as CaseOutcome) : undefined,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["case", id], updated);
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success(`Status updated to ${updated.status}`);
      setNextStatus("");
      setOutcome("");
    },
    onError: (e: ApiError) => toast.error(formatApiError(e)),
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!c) return <EmptyState title="Case not found" />;

  const currIdx = STATUS_STEPS.indexOf(c.status);
  const allowedNext = TRANSITIONS[c.status];

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/app/cases" className="hover:text-foreground">Cases</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-mono">#{c.case_number}</span>
      </nav>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-lg font-bold text-blue-600">#{c.case_number}</p>
            <p className="mt-1 text-sm">{c.incident_type.name} · {format(parseISO(c.date_of_incident), "dd MMM yyyy")}</p>
          </div>
          <Link to="/app/students/$id" params={{ id: c.student.id }} className="flex items-center gap-3">
            <Avatar name={c.student.full_name} />
            <div>
              <p className="text-sm font-medium">{c.student.full_name}</p>
              <p className="font-mono text-xs text-muted-foreground">{c.student.reg_number}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2"><SeverityBadge severity={c.severity} /><StatusBadge status={c.status} /></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate({ to: "/app/cases/$id/edit", params: { id } })}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {STATUS_STEPS.map((step, i) => (
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
              <div><dt className="text-muted-foreground">Location</dt><dd>{c.location || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Reported By</dt><dd>{c.reported_by}</dd></div>
              <div><dt className="text-muted-foreground">Assigned To</dt><dd>{c.assigned_to || "Unassigned"}</dd></div>
              {c.outcome && <div><dt className="text-muted-foreground">Outcome</dt><dd>{c.outcome}</dd></div>}
              {c.outcome_notes && <div className="col-span-2"><dt className="text-muted-foreground">Outcome Notes</dt><dd>{c.outcome_notes}</dd></div>}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Case Notes ({c.notes.length})</h3>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => {}} disabled><Plus className="h-3.5 w-3.5" /> Add</Button>
            </div>
            {c.notes.length ? (
              <ul className="space-y-3">
                {c.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
                    <p>{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.created_by_name} · {format(parseISO(n.created_at), "dd MMM yyyy HH:mm")}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 space-y-2">
              <Textarea placeholder="Add a note…" rows={3} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
              <Button size="sm" disabled={!noteBody.trim() || addNote.isPending} onClick={() => addNote.mutate(noteBody)}>
                {addNote.isPending ? "Saving…" : "Save Note"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Evidence Documents ({c.documents.length})</h3>
              <label className="cursor-pointer">
                <Button size="sm" variant="outline" className="gap-1" asChild>
                  <span><Upload className="h-3.5 w-3.5" /> {uploadDoc.isPending ? "Uploading…" : "Upload"}</span>
                </Button>
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.target.value = ""; }} />
              </label>
            </div>
            {c.documents.length ? (
              <ul className="space-y-2">
                {c.documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{d.original_filename}</p>
                      <p className="text-xs text-muted-foreground">{d.uploaded_by_name} · {format(parseISO(d.uploaded_at), "dd MMM yyyy")}</p>
                    </div>
                    <a href={d.file} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Download</a>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No documents uploaded" />}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
            <h3 className="mb-3 text-sm font-semibold">Case Info</h3>
            <dl className="space-y-1.5">
              {[
                ["Case", c.case_number],
                ["Status", c.status],
                ["Severity", c.severity],
                ["Date", c.date_of_incident],
                ["Reported By", c.reported_by],
                ["Assigned", c.assigned_to || "Unassigned"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-mono text-xs">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {allowedNext && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">Change Status</h3>
              <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as CaseStatus)}>
                <SelectTrigger><SelectValue placeholder="Move to next status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={allowedNext}>{allowedNext.replace("_", " ")}</SelectItem>
                </SelectContent>
              </Select>
              {nextStatus === "DECIDED" && (
                <div className="mt-3">
                  <Select value={outcome} onValueChange={(v) => setOutcome(v as CaseOutcome)}>
                    <SelectTrigger><SelectValue placeholder="Select outcome *" /></SelectTrigger>
                    <SelectContent>
                      {OUTCOME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="mt-3 w-full"
                disabled={!nextStatus || (nextStatus === "DECIDED" && !outcome) || transition.isPending}
                onClick={() => transition.mutate()}
              >
                {transition.isPending ? "Updating…" : "Apply"}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
