import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { studentsApi } from "@/api/students";
import { toast } from "sonner";
import { formatApiError, type ApiError } from "@/api/client";

export const Route = createFileRoute("/_app/app/students/$id/edit")({ component: StudentEditPage });

function StudentEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: s, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsApi.get(id),
  });

  const update = useMutation({
    mutationFn: (fd: FormData) => studentsApi.update(id, fd),
    onSuccess: () => {
      toast.success("Student updated");
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate({ to: "/app/students/$id", params: { id } });
    },
    onError: (e: ApiError) => toast.error(formatApiError(e)),
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!s) return <p>Student not found</p>;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    update.mutate(fd);
  };

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/app/students" className="hover:text-foreground">Students</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/app/students/$id" params={{ id }} className="hover:text-foreground">{s.full_name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span>Edit</span>
      </nav>
      <PageHeader title={`Edit ${s.full_name}`} />
      <form onSubmit={submit} className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-6">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First Name</Label><Input name="first_name" defaultValue={s.first_name} /></div>
          <div><Label>Last Name</Label><Input name="last_name" defaultValue={s.last_name} /></div>
        </div>
        <div><Label>Registration Number</Label><Input name="reg_number" defaultValue={s.reg_number} /></div>
        <div><Label>Level</Label><Input name="level" defaultValue={s.level} /></div>
        <div><Label>Phone</Label><Input name="phone" defaultValue={s.phone} /></div>
        <div><Label>Email</Label><Input name="email" type="email" defaultValue={s.email} /></div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/students/$id", params: { id } })}>Cancel</Button>
          <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </div>
  );
}
