import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { casesApi } from "@/api/cases";
import { toast } from "sonner";
import type { ApiError } from "@/api/client";

export const Route = createFileRoute("/_app/app/cases/$id/edit")({ component: CaseEditPage });

function CaseEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: c, isLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: () => casesApi.get(id),
  });

  const update = useMutation({
    mutationFn: (description: string) => casesApi.update(id, { description }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["case", id], updated);
      toast.success("Case updated");
      navigate({ to: "/app/cases/$id", params: { id } });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!c) return <p>Case not found</p>;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    update.mutate(fd.get("description") as string);
  };

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/app/cases" className="hover:text-foreground">Cases</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/app/cases/$id" params={{ id }} className="hover:text-foreground">#{c.case_number}</Link>
        <ChevronRight className="h-3 w-3" />
        <span>Edit</span>
      </nav>
      <PageHeader title={`Edit Case #${c.case_number}`} />
      <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <Label>Description</Label>
          <Textarea name="description" defaultValue={c.description} rows={6} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/cases/$id", params: { id } })}>Cancel</Button>
          <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </div>
  );
}
