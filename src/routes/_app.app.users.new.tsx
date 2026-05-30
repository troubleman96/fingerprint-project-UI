import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";
import { usersApi } from "@/api/users";
import { toast } from "sonner";
import type { ApiError } from "@/api/client";

export const Route = createFileRoute("/_app/app/users/new")({ component: UserCreatePage });

const descs: Record<string, string> = {
  ADMIN: "Full access to all modules including user management, audit log, and system settings.",
  OFFICER: "Can manage cases, review incidents, access reports. Cannot manage user accounts.",
  STAFF: "Can register students and file incident reports. Limited read access.",
};

function UserCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [r, setR] = useState("OFFICER");

  if (role !== "ADMIN") return <p>Restricted</p>;

  const create = useMutation({
    mutationFn: (fd: FormData) =>
      usersApi.create({
        email: fd.get("email") as string,
        full_name: fd.get("full_name") as string,
        role: r,
        password: fd.get("password") as string,
        department: (fd.get("department") as string) || undefined,
      }),
    onSuccess: () => {
      toast.success("User created");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate({ to: "/app/users" });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pass = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;
    if (pass !== confirm) { toast.error("Passwords do not match"); return; }
    create.mutate(fd);
  };

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/app/users" className="hover:text-foreground">Users</Link>
        <ChevronRight className="h-3 w-3" />
        <span>New</span>
      </nav>
      <PageHeader title="Create User Account" />
      <form onSubmit={submit} className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-6">
        <div><Label>Full Name *</Label><Input name="full_name" required /></div>
        <div><Label>Email *</Label><Input name="email" type="email" required /></div>
        <div>
          <Label>Role *</Label>
          <Select value={r} onValueChange={setR}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Administrator</SelectItem>
              <SelectItem value="OFFICER">Disciplinary Officer</SelectItem>
              <SelectItem value="STAFF">Staff / Clerk</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground">{descs[r]}</p>
        </div>
        <div><Label>Department</Label><Input name="department" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Password *</Label><Input name="password" type="password" minLength={8} required /></div>
          <div><Label>Confirm Password *</Label><Input name="confirm" type="password" required /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/users" })}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Account"}</Button>
        </div>
      </form>
    </div>
  );
}
