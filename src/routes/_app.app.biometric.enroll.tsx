import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/biometric/enroll")({ component: EnrollPage });

function generateMockHash(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function EnrollPage() {
  const queryClient = useQueryClient();
  const [reg, setReg] = useState("");
  const [student, setStudent] = useState<StudentListItem | null>(null);
  const [searching, setSearching] = useState(false);
  const [finger, setFinger] = useState("right_index");
  const [templateHash, setTemplateHash] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const findStudent = async () => {
    if (!reg.trim()) return;
    setSearching(true);
    try {
      const res = await studentsApi.list({ search: reg.trim(), page_size: 1 });
      const found = res.data[0] ?? null;
      setStudent(found);
      setTemplateHash(null);
      if (!found) toast.error("No student found");
    } finally {
      setSearching(false);
    }
  };

  const handleScanComplete = (ok: boolean) => {
    if (ok) {
      setTemplateHash(generateMockHash());
    }
  };

  const confirmEnroll = async () => {
    if (!student || !templateHash) return;
    setEnrolling(true);
    try {
      await biometricApi.enroll({
        reg_number: student.reg_number,
        template_hash: templateHash,
        finger_used: finger,
        quality_score: 0.95,
      });
      toast.success(`Fingerprint enrolled for ${student.full_name}`);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", student.id] });
      setStudent(null);
      setTemplateHash(null);
      setReg("");
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/app/biometric" className="hover:text-foreground">Biometric</Link>
        <ChevronRight className="h-3 w-3" />
        <span>Enroll</span>
      </nav>
      <PageHeader title="Enroll Student Fingerprint" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 font-semibold">Student Search</h3>
          <div className="flex gap-2">
            <Input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="Reg number or name" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), findStudent())} />
            <Button onClick={findStudent} disabled={searching}>{searching ? "…" : "Search"}</Button>
          </div>
          {student && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border p-3">
              <Avatar name={student.full_name} />
              <div>
                <p className="font-medium">{student.full_name}</p>
                <p className="font-mono text-xs text-muted-foreground">{student.reg_number} · {student.department_name}</p>
                {student.biometric_enrolled && <p className="text-xs text-amber-600 mt-0.5">Already enrolled — re-enrolling will replace existing template</p>}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 font-semibold">Fingerprint Scanner</h3>
          <p className="mb-3 inline-flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Scanner Ready
          </p>
          <Label className="text-xs">Select Finger</Label>
          <RadioGroup value={finger} onValueChange={setFinger} className="my-3 grid grid-cols-2 gap-2 text-sm">
            {["right_thumb", "right_index", "left_thumb", "left_index"].map((f) => (
              <label key={f} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2">
                <RadioGroupItem value={f} />{f.replace("_", " ")}
              </label>
            ))}
          </RadioGroup>
          <BiometricSimulator forceSuccess onResult={handleScanComplete} label={templateHash ? "Template captured ✓" : "Scan fingerprint"} />
          <Button
            className="mt-4 w-full"
            disabled={!student || !templateHash || enrolling}
            onClick={confirmEnroll}
          >
            {enrolling ? "Enrolling…" : "Confirm Enrollment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
