import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/users/new")({ component: UserCreatePage });

const descs: Record<string, string> = {
  ADMIN: "Full access to all modules including user management, audit log, and system settings.",
  OFFICER: "Can manage cases, review incidents, access reports. Cannot manage user accounts.",
  STAFF: "Can register students and file incident reports. Limited read access.",
};

function UserCreatePage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const [r, setR] = useState("OFFICER");
  if (role !== "ADMIN") return <p>Restricted</p>;
  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground"><Link to="/app/users">Users</Link><ChevronRight className="h-3 w-3" /><span>New</span></nav>
      <PageHeader title="Create User Account" />
      <form onSubmit={(e) => { e.preventDefault(); toast.success("User created"); navigate({ to: "/app/users" }); }} className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-6">
        <div><Label>Full Name *</Label><Input required /></div>
        <div><Label>Email *</Label><Input type="email" required /></div>
        <div><Label>Role *</Label><Select value={r} onValueChange={setR}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ADMIN">Administrator</SelectItem><SelectItem value="OFFICER">Disciplinary Officer</SelectItem><SelectItem value="STAFF">Staff / Clerk</SelectItem></SelectContent></Select>
          <p className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground">{descs[r]}</p>
        </div>
        <div><Label>Department</Label><Input /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Password *</Label><Input type="password" minLength={8} required /></div>
          <div><Label>Confirm Password *</Label><Input type="password" required /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked /> Send welcome email</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => navigate({ to: "/app/users" })}>Cancel</Button><Button type="submit">Create Account</Button></div>
      </form>
    </div>
  );
}
