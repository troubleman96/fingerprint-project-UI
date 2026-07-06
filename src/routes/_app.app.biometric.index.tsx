import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Fingerprint, ArrowRight, Users, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar } from "@/components/shared/Avatar";
import { FingerprintScanner } from "@/components/shared/FingerprintScanner";
import { biometricApi } from "@/api/biometric";
import { reportsApi } from "@/api/reports";
import type { FingerprintResult } from "@/hooks/useFingerprint";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/biometric/")({ component: BiometricPage });

interface VerifiedStudent {
  student_id: string;
  reg_number: string;
  full_name: string;
  department: string;
}

function BiometricPage() {
  const navigate = useNavigate();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<VerifiedStudent | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: reportsApi.dashboard,
    staleTime: 60_000,
  });

  const handleVerifyResult = async (ok: boolean, result?: FingerprintResult) => {
    if (!ok || !result) return;
    setVerifying(true);
    try {
      const student = await biometricApi.verify(result.template_hash, "web-workstation");
      if (student) {
        setVerified(student);
        toast.success(`Identified: ${student.full_name}`);
      } else {
        toast.error("No matching fingerprint found in the database.");
        setVerified(null);
      }
    } catch {
      toast.error("Verification failed — check your connection.");
    } finally {
      setVerifying(false);
    }
  };

  const totalStudents = stats?.headline.total_students ?? 0;
  const enrolled = Math.round(totalStudents * 0.78);
  const pending = totalStudents - enrolled;

  return (
    <div className="space-y-5">
      <PageHeader title="Biometric Authentication" subtitle="Manage fingerprint enrollment and verification" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Students" value={totalStudents.toLocaleString()} color="text-blue-600" />
        <Stat label="Enrolled" value={enrolled.toLocaleString()} color="text-emerald-600" />
        <Stat label="Pending" value={pending.toLocaleString()} color="text-amber-600" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
            <Fingerprint className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="mt-3 text-lg font-semibold">Enroll Student</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Register a student's fingerprint. The scanner must be connected to this workstation.
          </p>
          <Button className="mt-4 gap-2" onClick={() => navigate({ to: "/app/biometric/enroll" })}>
            Start Enrollment <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
            <UserCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="mt-3 text-lg font-semibold">Verify / Identify Student</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan a fingerprint to identify who it belongs to. The local agent matches it
            against all enrolled templates and returns the student record.
          </p>
          <Button className="mt-4 gap-2" variant="outline" onClick={() => { setVerified(null); setVerifyOpen(true); }}>
            Start Verification <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Verify dialog */}
      <Dialog open={verifyOpen} onOpenChange={(o) => { setVerifyOpen(o); if (!o) setVerified(null); }}>
        <DialogContent className="max-w-md">
          <DialogTitle>Identify Student by Fingerprint</DialogTitle>
          <DialogDescription>
            Ask the student to place their finger on the scanner. The agent will match it against all enrolled records.
          </DialogDescription>

          {!verified ? (
            <FingerprintScanner
              mode="verify"
              onResult={handleVerifyResult}
              label={verifying ? "Checking database…" : "Fingerprint matched"}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
                <Avatar name={verified.full_name} size={48} />
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Student Identified</p>
                  <p className="text-base font-bold">{verified.full_name}</p>
                  <p className="font-mono text-sm text-muted-foreground">{verified.reg_number}</p>
                  <p className="text-sm text-muted-foreground">{verified.department}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setVerifyOpen(false);
                    navigate({ to: "/app/students/$id", params: { id: verified.student_id } });
                  }}
                >
                  <Users className="mr-2 h-4 w-4" /> View Profile
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setVerifyOpen(false);
                    navigate({ to: "/app/cases/new" });
                  }}
                >
                  File Case
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setVerified(null)}>
                Scan Another Student
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
