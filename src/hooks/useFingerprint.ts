/**
 * useFingerprint — WebSocket bridge to the local fingerprint agent.
 *
 * Architecture
 * ─────────────
 * Browser ←── WebSocket (ws://localhost:4444) ──→ Local Agent
 *                                                      │
 *                                                  USB Scanner
 *
 * The local agent (agent/index.js) is a small Node.js process installed on
 * each workstation that has a USB fingerprint reader. It:
 *   1. Talks to the scanner via the vendor SDK (SecuGen, Mantra, ZKTeco…)
 *   2. Keeps a local SQLite cache of enrolled (hash → template binary) pairs
 *   3. For ENROLL: captures → extracts template → SHA256 hashes it → returns hash
 *   4. For VERIFY: captures → 1:N matches locally against cached templates →
 *      returns the STORED hash of the matched student (the same value that was
 *      stored in the Django DB at enroll time)
 *
 * When the agent is not running (dev / demo workstation without scanner) the
 * hook stays in "disconnected" state and callers can render a demo fallback.
 */

import { useState, useEffect, useRef, useCallback } from "react";

const AGENT_WS_URL =
  import.meta.env.VITE_FINGERPRINT_AGENT_URL ?? "ws://localhost:4444";

// How long to wait for a scan before timing out (ms)
const SCAN_TIMEOUT_MS = 30_000;

export type FingerprintState =
  | "disconnected"   // agent not running or unreachable
  | "connecting"     // WebSocket handshake in progress
  | "idle"           // connected, scanner ready
  | "waiting"        // sent start command, waiting for finger placement
  | "scanning"       // finger detected, extracting template
  | "processing"     // 1:N matching in progress (verify only)
  | "success"        // scan/match complete
  | "no_match"       // live scan found no enrolled match
  | "low_quality"    // scan quality too low, ask user to retry
  | "error";         // hardware or protocol error

export interface FingerprintResult {
  /** The stored SHA256 hash to send to POST /api/biometric/enroll/ or verify/ */
  template_hash: string;
  quality_score: number;
  finger_used: string;
}

interface AgentMessage {
  type: string;
  template_hash?: string;
  quality_score?: number;
  finger_used?: string;
  score?: number;
  message?: string;
  scanner?: string;
  version?: string;
  state?: FingerprintState;
}

export interface UseFingerprintReturn {
  /** Current scanner / agent state */
  state: FingerprintState;
  /** True when the WebSocket is open and the agent responded to ping */
  agentConnected: boolean;
  /** Human-readable scanner name reported by the agent */
  scannerName: string | null;
  /** Error message when state === "error" */
  error: string | null;
  /** The result hash when state === "success" */
  result: FingerprintResult | null;
  /** Initiate an enrollment scan */
  startEnroll: (finger?: string) => void;
  /** Initiate a 1:N verification scan */
  startVerify: () => void;
  /** Cancel an in-progress scan */
  cancel: () => void;
  /** Reset state back to idle (keeps connection alive) */
  reset: () => void;
}

export function useFingerprint(callbacks?: {
  onEnrollComplete?: (result: FingerprintResult) => void;
  onVerifyComplete?: (hash: string, score: number) => void;
  onNoMatch?: () => void;
}): UseFingerprintReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<FingerprintState>("disconnected");
  const [scannerName, setScannerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FingerprintResult | null>(null);

  // Callers pass a fresh { onEnrollComplete, ... } object literal on every
  // render. Reading it through a ref (instead of putting it in handleMessage's
  // dependency array) keeps handleMessage/connect referentially stable, so
  // the mount effect below doesn't tear down and reopen the WebSocket on
  // every re-render.
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const clearScanTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const armScanTimeout = (onTimeout: () => void) => {
    clearScanTimeout();
    timeoutRef.current = setTimeout(() => {
      onTimeout();
      setState("error");
      setError("Scan timed out — no finger detected within 30 seconds.");
    }, SCAN_TIMEOUT_MS);
  };

  const sendMsg = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const handleMessage = useCallback(
    (raw: string) => {
      let msg: AgentMessage;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      switch (msg.type) {
        case "pong":
          setScannerName(msg.scanner ?? "Fingerprint Scanner");
          setState("idle");
          break;

        case "status":
          if (msg.state) setState(msg.state);
          break;

        case "finger_placed":
          clearScanTimeout();
          setState("scanning");
          break;

        case "finger_lifted":
          // intermediate — do nothing, wait for result
          break;

        case "quality_warning":
          setState("low_quality");
          break;

        case "enroll_complete": {
          clearScanTimeout();
          const r: FingerprintResult = {
            template_hash: msg.template_hash!,
            quality_score: msg.quality_score ?? 0,
            finger_used: msg.finger_used ?? "right_index",
          };
          setResult(r);
          setState("success");
          callbacksRef.current?.onEnrollComplete?.(r);
          break;
        }

        case "verify_complete":
          clearScanTimeout();
          setState("success");
          setResult({
            template_hash: msg.template_hash!,
            quality_score: msg.score ?? 1,
            finger_used: "",
          });
          callbacksRef.current?.onVerifyComplete?.(msg.template_hash!, msg.score ?? 1);
          break;

        case "verify_no_match":
          clearScanTimeout();
          setState("no_match");
          callbacksRef.current?.onNoMatch?.();
          break;

        case "error":
          clearScanTimeout();
          setState("error");
          setError(msg.message ?? "Scanner error");
          break;
      }
    },
    [],
  );

  const connect = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setState("connecting");
    let socket: WebSocket;
    try {
      socket = new WebSocket(AGENT_WS_URL);
    } catch {
      setState("disconnected");
      return;
    }

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "ping" }));
    };

    socket.onmessage = (e) => handleMessage(e.data as string);

    socket.onerror = () => {
      setState("disconnected");
    };

    socket.onclose = () => {
      setState("disconnected");
      setScannerName(null);
    };

    wsRef.current = socket;
  }, [handleMessage]);

  // Auto-connect on mount; retry every 5 s if disconnected
  useEffect(() => {
    connect();
    reconnectRef.current = setInterval(() => {
      if (
        !wsRef.current ||
        wsRef.current.readyState === WebSocket.CLOSED ||
        wsRef.current.readyState === WebSocket.CLOSING
      ) {
        connect();
      }
    }, 5_000);
    return () => {
      clearScanTimeout();
      if (reconnectRef.current) clearInterval(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    state,
    agentConnected:
      state !== "disconnected" && state !== "connecting",
    scannerName,
    error,
    result,

    startEnroll: (finger = "right_index") => {
      setError(null);
      setResult(null);
      setState("waiting");
      sendMsg({ type: "start_enroll", finger });
      armScanTimeout(() => sendMsg({ type: "cancel" }));
    },

    startVerify: () => {
      setError(null);
      setResult(null);
      setState("waiting");
      sendMsg({ type: "start_verify" });
      armScanTimeout(() => sendMsg({ type: "cancel" }));
    },

    cancel: () => {
      clearScanTimeout();
      sendMsg({ type: "cancel" });
      setState("idle");
    },

    reset: () => {
      clearScanTimeout();
      setError(null);
      setResult(null);
      setState(
        wsRef.current?.readyState === WebSocket.OPEN ? "idle" : "disconnected",
      );
    },
  };
}
