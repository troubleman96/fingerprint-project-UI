import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cases } from "@/data/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/cases/$id/edit")({ component: CaseEditPage });

function CaseEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const c = cases.find((x) => x.id === Number(id));
  if (!c) return <p>Not found</p>;
  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground"><Link to="/app/cases">Cases</Link><ChevronRight className="h-3 w-3" /><span>Edit</span></nav>
      <PageHeader title={`Edit Case #${c.case_number}`} />
      <form onSubmit={(e) => { e.preventDefault(); toast.success("Case updated"); navigate({ to: "/app/cases/$id", params: { id } }); }} className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6">
        <div><Label>Description</Label><Textarea defaultValue={c.description} rows={6} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => navigate({ to: "/app/cases/$id", params: { id } })}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </div>
  );
}
