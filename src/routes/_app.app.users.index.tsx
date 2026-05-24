import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Avatar } from "@/components/shared/Avatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { StatCard } from "@/components/shared/StatCard";
import { users } from "@/data/mock";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

export const Route = createFileRoute("/_app/app/users/")({ component: UserMgmt });

function UserMgmt() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  if (role !== "ADMIN") return <div className="flex flex-col items-center gap-2 py-20 text-center"><Lock className="h-10 w-10 text-muted-foreground" /><h2 className="text-xl font-semibold">Access Restricted</h2><p className="text-sm text-muted-foreground">You need Administrator privileges to access User Management.</p></div>;

  const cols: Column<User>[] = [
    { key: "user", header: "User", render: (u) => <div className="flex items-center gap-2"><Avatar name={u.full_name} /><div><p className="text-sm font-medium">{u.full_name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div></div> },
    { key: "role", header: "Role", render: (u) => <RoleBadge role={u.role} /> },
    { key: "department", header: "Department" },
    { key: "is_active", header: "Status", render: (u) => <span className={u.is_active ? "text-emerald-600" : "text-red-600"}>{u.is_active ? "Active" : "Inactive"}</span> },
    { key: "joined", header: "Joined" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="User Management" subtitle="Manage institutional staff accounts" actions={<Button className="gap-2" onClick={() => navigate({ to: "/app/users/new" })}><Plus className="h-4 w-4" /> Add User</Button>} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard color="blue" label="Total Users" value={users.length} />
        <StatCard color="green" label="Active" value={users.filter((u) => u.is_active).length} />
        <StatCard color="red" label="Inactive" value={users.filter((u) => !u.is_active).length} />
      </div>
      <DataTable data={users} columns={cols} searchKeys={["full_name", "email"]} />
    </div>
  );
}
