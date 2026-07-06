import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Users, FolderOpen, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { reportsApi, type ExportDataset, type ExportFiletype } from "@/api/reports";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/export")({ component: ExportPage });

function ExportPage() {
  const [busy, setBusy] = useState<string | null>(null);

  const runExport = async (dataset: ExportDataset, filetype: ExportFiletype) => {
    const key = `${dataset}-${filetype}`;
    setBusy(key);
    try {
      await reportsApi.exportData(dataset, filetype);
      toast.success(`${dataset === "students" ? "Students" : "Cases"} exported as ${filetype.toUpperCase()}`);
    } catch {
      toast.error("Export failed — admin access is required.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Export"
        subtitle="Export institutional data to share with other institutions or systems"
      />

      <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Exports include the same fields visible elsewhere in the app — no raw biometric templates are ever included,
          only SHA256 hashes and case records. Use these to hand a student's disciplinary/crime history to another
          verified institution.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600"><Users className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold">Students</h3>
              <p className="text-xs text-muted-foreground">Reg number, name, department, biometric status, contact info</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" disabled={busy === "students-csv"} onClick={() => runExport("students", "csv")}>
              <Download className="h-4 w-4" /> {busy === "students-csv" ? "Exporting…" : "Export CSV"}
            </Button>
            <Button variant="outline" className="flex-1 gap-2" disabled={busy === "students-json"} onClick={() => runExport("students", "json")}>
              <Download className="h-4 w-4" /> {busy === "students-json" ? "Exporting…" : "Export JSON"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15 text-red-600"><FolderOpen className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold">Disciplinary Cases</h3>
              <p className="text-xs text-muted-foreground">Case number, student, incident type, severity, status, outcome</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" disabled={busy === "cases-csv"} onClick={() => runExport("cases", "csv")}>
              <Download className="h-4 w-4" /> {busy === "cases-csv" ? "Exporting…" : "Export CSV"}
            </Button>
            <Button variant="outline" className="flex-1 gap-2" disabled={busy === "cases-json"} onClick={() => runExport("cases", "json")}>
              <Download className="h-4 w-4" /> {busy === "cases-json" ? "Exporting…" : "Export JSON"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
