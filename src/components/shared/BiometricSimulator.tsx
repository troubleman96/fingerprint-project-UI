import { useState } from "react";
import { Fingerprint, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "idle" | "scanning" | "success" | "failure";

export function BiometricSimulator({ forceSuccess, onResult, label }: { forceSuccess?: boolean; onResult?: (ok: boolean) => void; label?: string }) {
  const [state, setState] = useState<State>("idle");

  const scan = () => {
    setState("scanning");
    setTimeout(() => {
      const ok = forceSuccess || Math.random() < 0.8;
      setState(ok ? "success" : "failure");
      onResult?.(ok);
    }, 1800);
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6">
      <div className="relative flex h-32 w-32 items-center justify-center">
        {state === "scanning" && (
          <>
            <span className="scan-ring absolute inset-0 rounded-full border-2 border-blue-500" />
            <span className="scan-ring absolute inset-0 rounded-full border-2 border-blue-500" style={{ animationDelay: "0.4s" }} />
            <span className="scan-ring absolute inset-0 rounded-full border-2 border-blue-500" style={{ animationDelay: "0.8s" }} />
          </>
        )}
        <div className={`flex h-20 w-20 items-center justify-center rounded-full ${
          state === "success" ? "bg-emerald-500/15 text-emerald-500 ring-2 ring-emerald-500" :
          state === "failure" ? "bg-red-500/15 text-red-500 ring-2 ring-red-500" :
          "bg-blue-500/15 text-blue-500"
        }`}>
          {state === "success" ? <Check className="h-10 w-10" /> : state === "failure" ? <X className="h-10 w-10" /> : <Fingerprint className="h-10 w-10" />}
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">
          {state === "idle" && "Ready to scan"}
          {state === "scanning" && <span className="animate-pulse">Scanning...</span>}
          {state === "success" && (label || "Match found")}
          {state === "failure" && "No match — try again"}
        </p>
        {state === "success" && <p className="mt-1 text-xs text-muted-foreground">Quality: Excellent (0.94)</p>}
      </div>
      {state === "idle" && <Button onClick={scan} className="gap-2"><Fingerprint className="h-4 w-4" /> Scan Fingerprint</Button>}
      {(state === "failure" || state === "success") && <Button variant="outline" onClick={() => setState("idle")}>Retry</Button>}
    </div>
  );
}
