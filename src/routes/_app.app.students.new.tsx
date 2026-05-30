import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BiometricSimulator } from "@/components/shared/BiometricSimulator";
import { departmentsApi } from "@/api/departments";
import { studentsApi } from "@/api/students";
import { toast } from "sonner";
import type { ApiError } from "@/api/client";

export const Route = createFileRoute("/_app/app/students/new")({ component: StudentCreatePage });

function StudentCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [enroll, setEnroll] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", reg_number: "",
    date_of_birth: "", gender: "", phone: "", email: "",
    department_id: "", academic_year: "", level: "",
  });

  const { data: depts = [] } = useQuery<import("@/types").Department[]>({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.list(),
    staleTime: 5 * 60_000,
  });

  const create = useMutation({
    mutationFn: (payload: FormData) => studentsApi.create(payload),
    onSuccess: (student) => {
      toast.success("Student registered successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate({ to: "/app/students/$id", params: { id: student.id } });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("first_name", form.first_name);
    fd.append("last_name", form.last_name);
    fd.append("reg_number", form.reg_number);
    fd.append("academic_year", form.academic_year);
    if (form.department_id) fd.append("department_id", form.department_id);
    if (form.date_of_birth) fd.append("date_of_birth", form.date_of_birth);
    if (form.gender) fd.append("gender", form.gender);
    if (form.phone) fd.append("phone", form.phone);
    if (form.email) fd.append("email", form.email);
    if (form.level) fd.append("level", form.level);
    if (photo) fd.append("photo", photo);
    create.mutate(fd);
  };

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/app/students" className="hover:text-foreground">Students</Link>
        <ChevronRight className="h-3 w-3" />
        <span>Register</span>
      </nav>
      <PageHeader title="Register New Student" />
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
        <Card title="Personal Information">
          <Field label="First Name *"><Input required {...field("first_name")} /></Field>
          <Field label="Last Name *"><Input required {...field("last_name")} /></Field>
          <Field label="Registration Number *"><Input placeholder="e.g. CSC/2024/001" required {...field("reg_number")} /></Field>
          <Field label="Date of Birth"><Input type="date" {...field("date_of_birth")} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="O">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Phone"><Input {...field("phone")} /></Field>
          <Field label="Email"><Input type="email" {...field("email")} /></Field>
        </Card>
        <div className="space-y-5">
          <Card title="Academic Information">
            <Field label="Department *">
              <Select value={form.department_id} onValueChange={(v) => setForm((f) => ({ ...f, department_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Academic Year *">
              <Select value={form.academic_year} onValueChange={(v) => setForm((f) => ({ ...f, academic_year: v }))}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023/2024">2023/2024</SelectItem>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Level"><Input placeholder="NTA Level 6" {...field("level")} /></Field>
          </Card>
          <Card title="Photo Upload">
            <label className="block cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground hover:border-blue-500">
              <Upload className="mx-auto mb-2 h-8 w-8" />
              {photo ? photo.name : "Click to upload or drag photo here"}
              <p className="mt-1 text-xs">Max 2MB · JPG, PNG</p>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
          </Card>
          <Card title="Biometric Enrollment">
            <div className="flex items-center justify-between">
              <Label>Enroll fingerprint now</Label>
              <Switch checked={enroll} onCheckedChange={setEnroll} />
            </div>
            {enroll && (
              <div className="mt-4">
                <BiometricSimulator label="Biometric captured — will be enrolled after save" />
              </div>
            )}
          </Card>
        </div>
        <div className="lg:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/students" })}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save Student"}</Button>
        </div>
      </form>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-4 rounded-xl border border-border bg-card p-5"><h3 className="text-sm font-semibold">{title}</h3>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
