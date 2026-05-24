import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Upload, FileText, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BiometricSimulator } from "@/components/shared/BiometricSimulator";
import { students, incidentTypes, users } from "@/data/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/cases/new")({ component: CaseCreatePage });

function CaseCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("reg");
  const [reg, setReg] = useState("");
  const [student, setStudent] = useState<typeof students[number] | null>(null);
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [assignee, setAssignee] = useState("");
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);

  const findStudent = () => {
    const s = students.find((x) => x.reg_number.includes(reg.trim())) || students[0];
    setStudent(s);
  };

  const submit = () => {
    toast.success(`Case #DIT-2024-0442 filed successfully`);
    setTimeout(() => navigate({ to: "/app/cases" }), 600);
  };

  const steps = ["Student", "Incident", "Evidence", "Review"];

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground"><Link to="/app/cases">Cases</Link><ChevronRight className="h-3 w-3" /><span>New Case</span></nav>
      <PageHeader title="File New Case" />

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${step > i ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
            <span className={`text-sm ${step === i + 1 ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
            {i < 3 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Identify Student</h3>
            <RadioGroup value={method} onValueChange={setMethod} className="grid gap-3 md:grid-cols-2">
              <label className={`cursor-pointer rounded-lg border p-4 ${method === "reg" ? "border-blue-600" : "border-border"}`}>
                <RadioGroupItem value="reg" className="sr-only" />
                <p className="font-medium">Search by Registration Number</p>
                <div className="mt-3 flex gap-2"><Input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="e.g. 2202..." /><Button type="button" onClick={findStudent}>Search</Button></div>
              </label>
              <label className={`cursor-pointer rounded-lg border p-4 ${method === "bio" ? "border-blue-600" : "border-border"}`}>
                <RadioGroupItem value="bio" className="sr-only" />
                <p className="mb-3 font-medium">Biometric Scan</p>
                <BiometricSimulator forceSuccess onResult={(ok) => ok && setStudent(students[0])} />
              </label>
            </RadioGroup>
            {student && (
              <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold text-emerald-600">Student Found</p>
                <p className="mt-1">{student.first_name} {student.last_name} · <span className="font-mono">{student.reg_number}</span> · {student.department}</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Incident Type *</Label><Select value={type} onValueChange={(v) => { setType(v); const i = incidentTypes.find((x) => x.name === v); if (i) setSeverity(i.default_severity); }}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{incidentTypes.map((t) => <SelectItem key={t.id} value={t.name}>{t.name} ({t.default_severity})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Severity *</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem></SelectContent></Select></div>
            <div><Label>Date of Incident *</Label><Input type="date" max={new Date().toISOString().slice(0,10)} value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Block B, Room 204" /></div>
            <div className="md:col-span-2"><Label>Description * <span className="text-xs text-muted-foreground">({desc.length}/50 min)</span></Label><Textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Assign to Officer</Label><Select value={assignee} onValueChange={setAssignee}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent>{users.filter((u) => u.role === "OFFICER" || u.role === "ADMIN").map((u) => <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>)}</SelectContent></Select></div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <label className="block cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground hover:border-blue-500">
              <Upload className="mx-auto mb-2 h-8 w-8" />
              Click to upload or drag files — PDF, JPG, PNG, DOCX · max 5MB each
              <input type="file" multiple className="hidden" onChange={(e) => { const fs = Array.from(e.target.files || []).map((f) => ({ name: f.name, size: f.size })); setFiles([...files, ...fs]); }} />
            </label>
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1"><p className="font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p></div>
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold">Review & Submit</h3>
            <dl className="grid gap-2 rounded-lg border border-border p-4">
              <Row k="Student" v={student ? `${student.first_name} ${student.last_name} · ${student.reg_number}` : "—"} />
              <Row k="Incident" v={`${type || "—"} (${severity || "—"})`} />
              <Row k="Date" v={date || "—"} />
              <Row k="Location" v={location || "—"} />
              <Row k="Assigned to" v={assignee || "Unassigned"} />
              <Row k="Attachments" v={`${files.length} file(s)`} />
            </dl>
            <div className="rounded-lg bg-muted p-3 text-sm">{desc || <span className="text-muted-foreground">No description</span>}</div>
            <p className="text-xs text-amber-600">⚠ Submitting this case will notify the assigned officer and create an immutable audit record.</p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>← Back</Button>
          {step < 4 ? <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !student}>Next Step →</Button> : <Button onClick={submit}>Submit Case</Button>}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>;
}
