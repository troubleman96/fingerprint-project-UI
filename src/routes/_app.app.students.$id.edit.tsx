import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { students } from "@/data/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/students/$id/edit")({ component: StudentEditPage });

function StudentEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const s = students.find((x) => x.id === Number(id));
  if (!s) return <p>Not found</p>;

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground"><Link to="/app/students">Students</Link><ChevronRight className="h-3 w-3" /><span>Edit</span></nav>
      <PageHeader title={`Edit ${s.first_name} ${s.last_name}`} />
      <form onSubmit={(e) => { e.preventDefault(); toast.success("Student updated"); navigate({ to: "/app/students/$id", params: { id } }); }} className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-6">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First Name</Label><Input defaultValue={s.first_name} /></div>
          <div><Label>Last Name</Label><Input defaultValue={s.last_name} /></div>
        </div>
        <div><Label>Reg Number</Label><Input defaultValue={s.reg_number} /></div>
        <div><Label>Department</Label><Input defaultValue={s.department} /></div>
        <div><Label>Phone</Label><Input defaultValue={s.phone} /></div>
        <div><Label>Email</Label><Input defaultValue={s.email} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => navigate({ to: "/app/students/$id", params: { id } })}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </div>
  );
}
