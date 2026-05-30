/**
 * BiometricSimulator / FingerprintScanner
 *
 * When the local agent is running (ws://localhost:4444) this component uses
 * real hardware via the useFingerprint hook.
 * When the agent is offline it falls back to a timed simulation so the UI
 * stays explorable during development or demos without a scanner attached.
 */
import { useState, useEffect } from "react";
import { Fingerprint, Check, X, WifiOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFingerprint, type FingerprintResult } from "@/hooks/useFingerprint";

export interface BiometricSimulatorProps {
  /** Force simulation to always succeed (dev/demo mode) */
  forceSuccess?: boolean;
  /** Called with true on success, false on failure */
  onResult?: (ok: boolean, result?: FingerprintResult) => void;
  /** Override the success label text */
  label?: string;
  /** "enroll" or "verify" — determines which agent command is sent */
  mode?: "enroll" | "verify";
  /** Finger to enroll (only used when mode === "enroll") */
  finger?: string;
}

type VisualState = "idle" | "scanning" | "success" | "failure" | "no_match" | "low_quality";

export function BiometricSimulator({
  forceSuccess,
  onResult,
  label,
  mode = "enroll",
  finger = "right_index",
}: BiometricSimulatorProps) {
  const [visual, setVisual] = useState<VisualState>("idle");
  const [simRunning, setSimRunning] = useState(false);

  const fp = useFingerprint({
    onEnrollComplete: (result) => {
      setVisual("success");
      onResult?.(true, result);
    },
    onVerifyComplete: (hash, score) => {
      setVisual("success");
      onResult?.(true, { template_hash: hash, quality_score: score, finger_used: "" });
    },
    onNoMatch: () => {
      setVisual("no_match");
      onResult?.(false);
    },
  });

  // Keep visual in sync with agent state
  useEffect(() => {
    if (!fp.agentConnected) return;
    if (fp.state === "waiting" || fp.state === "scanning" || fp.state === "processing") {
      setVisual("scanning");
    } else if (fp.state === "success") {
      setVisual("success");
    } else if (fp.state === "no_match") {
      setVisual("no_match");
    } else if (fp.state === "low_quality") {
      setVisual("low_quality");
    } else if (fp.state === "error") {
      setVisual("failure");
    }
  }, [fp.state, fp.agentConnected]);

  // ── Simulation fallback (agent offline) ──────────────────────────────────
  const runSim = () => {
    if (simRunning) return;
    setSimRunning(true);
    setVisual("scanning");
    setTimeout(() => {
      const ok = forceSuccess !== undefined ? forceSuccess : Math.random() < 0.8;
      setVisual(ok ? "success" : "failure");
      setSimRunning(false);
      if (ok) {
        onResult?.(true, {
          template_hash: Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
          quality_score: 0.94,
          finger_used: finger,
        });
      } else {
        onResult?.(false);
      }
    }, 1800);
  };

  const handleScanClick = () => {
    if (fp.agentConnected) {
      if (mode === "verify") {
        fp.startVerify();
      } else {
        fp.startEnroll(finger);
      }
    } else {
      runSim();
    }
  };

  const handleRetry = () => {
    setVisual("idle");
    if (fp.agentConnected) fp.reset();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isActive = visual === "scanning";
  const isSuccess = visual === "success";
  const isFail = visual === "failure" || visual === "no_match" || visual === "low_quality";

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6">
      {/* Agent status banner */}
      {!fp.agentConnected && (
        <div className="flex w-full items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Agent offline</strong> — running in demo mode.{" "}
            <a
              href="https://github.com/troubleman96/fingerprint-project-UI/blob/main/agent/README.md"
              target="_blank"
              rel="noreferrer"
              className="underline hover:no-underline"
            >
              Install the local agent
            </a>{" "}
            to use a real scanner.
          </span>
        </div>
      )}

      {fp.agentConnected && (
        <div className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {fp.scannerName ?? "Scanner"} ready
        </div>
      )}

      {/* Scanner circle */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {isActive && (
          <>
            <span className="scan-ring absolute inset-0 rounded-full border-2 border-blue-500" />
            <span className="scan-ring absolute inset-0 rounded-full border-2 border-blue-500" style={{ animationDelay: "0.4s" }} />
            <span className="scan-ring absolute inset-0 rounded-full border-2 border-blue-500" style={{ animationDelay: "0.8s" }} />
          </>
        )}
        <div className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
          isSuccess ? "bg-emerald-500/15 text-emerald-500 ring-2 ring-emerald-500" :
          isFail    ? "bg-red-500/15 text-red-500 ring-2 ring-red-500" :
          isActive  ? "bg-blue-500/15 text-blue-600 ring-2 ring-blue-500/50" :
                      "bg-blue-500/15 text-blue-500"
        }`}>
          {isSuccess ? <Check className="h-10 w-10" /> :
           isFail    ? <X className="h-10 w-10" /> :
                       <Fingerprint className={`h-10 w-10 ${isActive ? "animate-pulse" : ""}`} />}
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-sm font-medium">
          {visual === "idle"        && "Ready to scan"}
          {visual === "scanning"    && <span className="animate-pulse">
            {fp.state === "waiting"    ? "Place finger on scanner…" :
             fp.state === "processing" ? "Matching…" :
                                        "Scanning…"}
          </span>}
          {visual === "success"     && (label ?? "Scan successful")}
          {visual === "failure"     && "Scan failed — try again"}
          {visual === "no_match"    && "No matching fingerprint found"}
          {visual === "low_quality" && "Poor quality — press firmer and retry"}
        </p>
        {isSuccess && fp.result && (
          <p className="mt-1 text-xs text-muted-foreground">
            Quality: {(fp.result.quality_score * 100).toFixed(0)}%
            {fp.result.finger_used ? ` · ${fp.result.finger_used.replace("_", " ")}` : ""}
          </p>
        )}
        {isSuccess && !fp.result && (
          <p className="mt-1 text-xs text-muted-foreground">Quality: Excellent (demo)</p>
        )}
        {fp.error && (
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-red-500">
            <AlertTriangle className="h-3 w-3" /> {fp.error}
          </p>
        )}
      </div>

      {/* Action button */}
      {visual === "idle" && (
        <Button onClick={handleScanClick} className="gap-2" disabled={simRunning}>
          <Fingerprint className="h-4 w-4" />
          {mode === "verify" ? "Scan to Identify" : "Scan Fingerprint"}
        </Button>
      )}
      {visual === "scanning" && fp.agentConnected && (
        <Button variant="outline" onClick={fp.cancel}>Cancel</Button>
      )}
      {(isFail || isSuccess) && (
        <Button variant="outline" onClick={handleRetry}>
          {isFail ? "Retry Scan" : "Scan Again"}
        </Button>
      )}
    </div>
  );
}
