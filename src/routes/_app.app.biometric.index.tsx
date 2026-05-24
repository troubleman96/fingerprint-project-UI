import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Fingerprint, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BiometricSimulator } from "@/components/shared/BiometricSimulator";

export const Route = createFileRoute("/_app/app/biometric/")({ component: BiometricPage });

function BiometricPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-5">
      <PageHeader title="Biometric Authentication" subtitle="Manage fingerprint enrollment and verification" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <Fingerprint className="mb-3 h-8 w-8 text-blue-600" />
          <h3 className="text-lg font-semibold">Enroll Student</h3>
          <p className="mt-1 text-sm text-muted-foreground">Register a student's fingerprint for secure identification.</p>
          <Button className="mt-4 gap-2" onClick={() => navigate({ to: "/app/biometric/enroll" })}>Start Enrollment <ArrowRight className="h-4 w-4" /></Button>
          <p className="mt-4 text-xs text-muted-foreground">1,247 enrolled · 342 pending</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Fingerprint className="mb-3 h-8 w-8 text-emerald-600" />
          <h3 className="text-lg font-semibold">Verify Student</h3>
          <p className="mt-1 text-sm text-muted-foreground">Scan to identify a student — pre-fills case forms automatically.</p>
          <Button className="mt-4 gap-2" variant="outline" onClick={() => setOpen(true)}>Start Verification <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Verify Identity</DialogTitle><BiometricSimulator /></DialogContent></Dialog>
    </div>
  );
}
