import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar } from "@/components/shared/Avatar";
import { BiometricSimulator } from "@/components/shared/BiometricSimulator";
import { studentsApi } from "@/api/students";
import { biometricApi } from "@/api/biometric";
import { useQueryClient } from "@tanstack/react-query";
import type { StudentListItem } from "@/types";
import type { FingerprintResult } from "@/hooks/useFingerprint";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/biometric/enroll")({ component: EnrollPage });

type Step = "search" | "scan" | "confirm" | "done";

function EnrollPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("search");
  const [reg, setReg] = useState("");
  const [student, setStudent] = useState<StudentListItem | null>(null);
  const [searching, setSearching] = useState(false);
  const [finger, setFinger] = useState("right_index");
  const [scanResult, setScanResult] = useState<FingerprintResult | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const findStudent = async () => {
    if (!reg.trim()) return;
    setSearching(true);
    try {
      const res = await studentsApi.list({ search: reg.trim(), page_size: 1 });
      const found = res.data[0] ?? null;
      setStudent(found);
      setScanResult(null);
      if (!found) {
        toast.error("No student found with that registration number or name.");
      } else {
        setStep("scan");
      }
    } finally {
      setSearching(false);
    }
  };

  const handleScanResult = (ok: boolean, result?: FingerprintResult) => {
    if (!ok || !result) {
      toast.error("Scan unsuccessful — ask the student to try again.");
      return;
    }
    setScanResult(result);
    setStep("confirm");
  };

  const confirmEnroll = async () => {
    if (!student || !scanResult) return;
    setEnrolling(true);
    try {
      await biometricApi.enroll({
        reg_number: student.reg_number,
        template_hash: scanResult.template_hash,
        finger_used: scanResult.finger_used || finger,
        quality_score: scanResult.quality_score,
      });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", student.id] });
      setStep("done");
      toast.success(`Fingerprint enrolled for ${student.full_name}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setEnrolling(false);
    }
  };

  const reset = () => {
    setStep("search");
    setReg("");
    setStudent(null);
    setScanResult(null);
  };

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/app/biometric" className="hover:text-foreground">Biometric</Link>
        <ChevronRight className="h-3 w-3" />
        <span>Enroll</span>
      </nav>
      <PageHeader title="Enroll Student Fingerprint" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
        {(["search", "scan", "confirm", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              step === "done" || (["search","scan","confirm"].indexOf(step) > i)
                ? "bg-emerald-500 text-white"
                : step === s
                ? "bg-blue-600 text-white"
                : "bg-muted text-muted-foreground"
            }`}>{i + 1}</div>
            <span className={`text-sm ${step === s ? "font-semibold" : "text-muted-foreground"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 3 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Left — Student search */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold">1. Find Student</h3>
          <div className="flex gap-2">
            <Input
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              placeholder="Reg number or name"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), findStudent())}
            />
            <Button onClick={findStudent} disabled={searching || !reg.trim()}>
              {searching ? "…" : "Search"}
            </Button>
          </div>
          {student && (
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Avatar name={student.full_name} />
              <div className="flex-1">
                <p className="font-medium">{student.full_name}</p>
                <p className="font-mono text-xs text-muted-foreground">{student.reg_number}</p>
                <p className="text-xs text-muted-foreground">{student.department_name}</p>
                {student.biometric_enrolled && (
                  <p className="mt-0.5 text-xs text-amber-600">
                    Already enrolled — enrolling again will replace the existing template.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Finger selection */}
          {step !== "search" && step !== "done" && (
            <div>
              <Label className="text-xs mb-2 block">Select Finger</Label>
              <RadioGroup value={finger} onValueChange={setFinger} className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { value: "right_index",  label: "Right Index" },
                  { value: "right_thumb",  label: "Right Thumb" },
                  { value: "left_index",   label: "Left Index" },
                  { value: "left_thumb",   label: "Left Thumb" },
                ].map((f) => (
                  <label key={f.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${finger === f.value ? "border-blue-600 bg-blue-500/5" : "border-border"}`}>
                    <RadioGroupItem value={f.value} />
                    {f.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Right — Scanner */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold">2. Scan Fingerprint</h3>

          {step === "search" && (
            <p className="text-sm text-muted-foreground">Find a student first to unlock the scanner.</p>
          )}

          {step === "scan" && (
            <BiometricSimulator
              mode="enroll"
              finger={finger}
              onResult={handleScanResult}
              label="Template captured — ready to enroll"
            />
          )}

          {step === "confirm" && scanResult && (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm space-y-1">
                <p className="font-semibold text-emerald-600">Scan Successful</p>
                <p>Quality: <span className="font-medium">{(scanResult.quality_score * 100).toFixed(0)}%</span></p>
                <p>Finger: <span className="font-medium">{(scanResult.finger_used || finger).replace("_", " ")}</span></p>
                <p className="font-mono text-xs text-muted-foreground break-all">
                  Hash: {scanResult.template_hash.slice(0, 32)}…
                </p>
              </div>
              <Button className="w-full" onClick={confirmEnroll} disabled={enrolling}>
                {enrolling ? "Saving to database…" : "Confirm Enrollment"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setStep("scan")}>
                Re-scan
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold">Enrollment Complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {student?.full_name}'s fingerprint is now registered.
                </p>
              </div>
              <Button onClick={reset}>Enroll Another Student</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
