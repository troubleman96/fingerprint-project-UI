import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BiometricSimulator } from "@/components/shared/BiometricSimulator";
import { departments } from "@/data/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/students/new")({ component: StudentCreatePage });

function StudentCreatePage() {
  const navigate = useNavigate();
  const [enroll, setEnroll] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Student registered successfully");
    setTimeout(() => navigate({ to: "/app/students" }), 600);
  };

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground"><Link to="/app/students" className="hover:text-foreground">Students</Link><ChevronRight className="h-3 w-3" /><span>Register</span></nav>
      <PageHeader title="Register New Student" />
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
        <Card title="Personal Information">
          <Field label="First Name *"><Input required /></Field>
          <Field label="Last Name *"><Input required /></Field>
          <Field label="Registration Number *"><Input placeholder="e.g. 220229358370" required /></Field>
          <Field label="Date of Birth"><Input type="date" /></Field>
          <Field label="Gender"><Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="m">Male</SelectItem><SelectItem value="f">Female</SelectItem><SelectItem value="o">Other</SelectItem></SelectContent></Select></Field>
          <Field label="Phone"><Input /></Field>
          <Field label="Email"><Input type="email" /></Field>
        </Card>
        <div className="space-y-5">
          <Card title="Academic Information">
            <Field label="Department *"><Select><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Academic Year *"><Select><SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger><SelectContent><SelectItem value="2023/2024">2023/2024</SelectItem><SelectItem value="2024/2025">2024/2025</SelectItem></SelectContent></Select></Field>
            <Field label="Level"><Input placeholder="NTA Level 6" /></Field>
          </Card>
          <Card title="Photo Upload">
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Upload className="mx-auto mb-2 h-8 w-8" />
              Click to upload or drag photo here
              <p className="mt-1 text-xs">Max 2MB · JPG, PNG</p>
            </div>
          </Card>
          <Card title="Biometric Enrollment">
            <div className="flex items-center justify-between">
              <Label>Enroll fingerprint now</Label>
              <Switch checked={enroll} onCheckedChange={setEnroll} />
            </div>
            {enroll && <div className="mt-4"><BiometricSimulator label="Enrolled successfully" /></div>}
          </Card>
        </div>
        <div className="lg:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/students" })}>Cancel</Button>
          <Button type="submit">Save Student</Button>
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
