import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Fingerprint, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Avatar } from "@/components/shared/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { studentsApi } from "@/api/students";
import { departmentsApi } from "@/api/departments";
import { reportsApi } from "@/api/reports";
import { useAuthStore } from "@/store/authStore";
import { formatApiError, type ApiError } from "@/api/client";
import type { StudentListItem } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/students/")({ component: StudentListPage });

function StudentListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const [dept, setDept] = useState<string>("all");
  const [status, setStatus] = useState("all");
  const [bio, setBio] = useState("all");

  const purge = useMutation({
    mutationFn: (id: string) => studentsApi.purge(id),
    onSuccess: () => {
      toast.success("Student permanently deleted");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: ApiError) => toast.error(formatApiError(e)),
  });

  const runExport = async () => {
    try {
      await reportsApi.exportData("students", "csv");
      toast.success("Students export downloaded");
    } catch {
      toast.error("Export failed — admin access is required.");
    }
  };

  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.list(),
    staleTime: 5 * 60_000,
  });

  const params = {
    ...(dept !== "all" ? { department: dept } : {}),
    ...(status !== "all" ? { is_active: status === "active" } : {}),
    ...(bio !== "all" ? { biometric_enrolled: bio === "enrolled" } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["students", params],
    queryFn: () => studentsApi.list(params),
    staleTime: 30_000,
  });

  const students = data?.data ?? [];
  const depts = deptsData ?? [];

  const cols: Column<StudentListItem>[] = [
    {
      key: "student",
      header: "Student",
      render: (s) => (
        <Link to="/app/students/$id" params={{ id: s.id }} className="flex items-center gap-3">
          <Avatar name={s.full_name} />
          <div>
            <p className="font-medium">{s.full_name}</p>
            <p className="font-mono text-xs text-muted-foreground">{s.reg_number}</p>
          </div>
        </Link>
      ),
    },
    { key: "department_name", header: "Department" },
    { key: "academic_year", header: "Year" },
    {
      key: "biometric_enrolled",
      header: "Biometric",
      render: (s) => s.biometric_enrolled
        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400"><Fingerprint className="h-3 w-3" /> Enrolled</span>
        : <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400"><Fingerprint className="h-3 w-3" /> Pending</span>,
    },
    {
      key: "case_count",
      header: "Cases",
      render: (s) => s.case_count > 0
        ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${s.case_count >= 3 ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-muted"}`}>{s.case_count}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "is_active",
      header: "Status",
      render: (s) => <span className={`text-xs font-medium ${s.is_active ? "text-emerald-600" : "text-red-600"}`}>{s.is_active ? "Active" : "Inactive"}</span>,
    },
    ...(isAdmin ? [{
      key: "actions",
      header: "",
      render: (s: StudentListItem) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-red-600 hover:bg-red-500/10 hover:text-red-600"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete {s.full_name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the student record entirely — not just deactivates it. This cannot be undone.
                It will fail if the student has any case history (deactivate instead in that case).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => purge.mutate(s.id)}>Delete Permanently</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    } as Column<StudentListItem>] : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        subtitle="Manage student profiles and biometric records"
        actions={<>
          <Button variant="outline" className="gap-2" onClick={runExport}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button className="gap-2" onClick={() => navigate({ to: "/app/students/new" })}><Plus className="h-4 w-4" /> Register Student</Button>
        </>}
      />
      <div className="flex flex-wrap gap-2">
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {depts.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bio} onValueChange={setBio}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Biometric</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="pending">Not Enrolled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading
        ? <Skeleton className="h-64 w-full rounded-xl" />
        : <DataTable
            data={students}
            columns={cols}
            searchKeys={["full_name", "reg_number", "department_name"]}
            onRowClick={(s) => navigate({ to: "/app/students/$id", params: { id: s.id } })}
          />
      }
    </div>
  );
}
