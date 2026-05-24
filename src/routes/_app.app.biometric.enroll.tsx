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
import { students } from "@/data/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/biometric/enroll")({ component: EnrollPage });

function EnrollPage() {
  const [reg, setReg] = useState("");
  const [student, setStudent] = useState<typeof students[number] | null>(null);
  const [finger, setFinger] = useState("right_index");
  const [scanned, setScanned] = useState(false);

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground"><Link to="/app/biometric">Biometric</Link><ChevronRight className="h-3 w-3" /><span>Enroll</span></nav>
      <PageHeader title="Enroll Student Fingerprint" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 font-semibold">Student Search</h3>
          <div className="flex gap-2"><Input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="Reg number or name" /><Button onClick={() => setStudent(students.find((s) => s.reg_number.includes(reg)) || students[0])}>Search</Button></div>
          {student && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border p-3">
              <Avatar name={`${student.first_name} ${student.last_name}`} />
              <div><p className="font-medium">{student.first_name} {student.last_name}</p><p className="font-mono text-xs text-muted-foreground">{student.reg_number} · {student.department}</p></div>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 font-semibold">Fingerprint Scanner</h3>
          <p className="mb-3 inline-flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Scanner Ready</p>
          <Label className="text-xs">Select Finger</Label>
          <RadioGroup value={finger} onValueChange={setFinger} className="my-3 grid grid-cols-2 gap-2 text-sm">
            {["right_thumb", "right_index", "left_thumb", "left_index"].map((f) => (
              <label key={f} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2"><RadioGroupItem value={f} />{f.replace("_", " ")}</label>
            ))}
          </RadioGroup>
          <BiometricSimulator forceSuccess onResult={(ok) => ok && setScanned(true)} label="Enrolled successfully" />
          <Button className="mt-4 w-full" disabled={!student || !scanned} onClick={() => toast.success("Enrollment confirmed")}>Confirm Enrollment</Button>
        </div>
      </div>
    </div>
  );
}
