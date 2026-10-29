import { useEffect, useRef, useState } from "react";
import { adminApi } from "@/lib/admin-api";

type Progress = { action: string; done: number; total: number; percent: number; at: number } | null;

const ACTION_LABELS: Record<string, string> = {
  run: "Settling 1 day",
  sales: "Adding 1 day of new sales",
  create: "Creating 300 members",
  reset: "Resetting",
};

/**
 * Runs one Test Lab action and polls the server's progress record every second,
 * so long settlements and member creation show a real percentage instead of a spinner.
 */
export function useTestLabAction() {
  const [running, setRunning] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const run = async <T,>(action: keyof typeof ACTION_LABELS, call: () => Promise<T>): Promise<T> => {
    setRunning(action);
    setProgress({ action, done: 0, total: 1, percent: 0, at: 0 });
    const startedAt = Math.floor(Date.now() / 1000) - 2;
    timer.current = window.setInterval(async () => {
      try {
        const p = await adminApi<Progress>("/test-lab/progress");
        // Ignore a stale record left by an earlier action.
        if (p && p.action === action && p.at >= startedAt) setProgress(p);
      } catch { /* keep the last value */ }
    }, 1000);
    try {
      const out = await call();
      setProgress({ action, done: 1, total: 1, percent: 100, at: 0 });
      return out;
    } finally {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      setRunning(null);
    }
  };

  const bar = progress && (running || progress.percent === 100) ? (
    <div className="w-full max-w-xl space-y-1" role="status" aria-live="polite">
      <div className="flex justify-between text-sm">
        <span>{ACTION_LABELS[progress.action] ?? progress.action}{running ? "…" : " — done"}{progress.total > 1 ? ` (${progress.done.toLocaleString()} / ${progress.total.toLocaleString()})` : ""}</span>
        <b>{progress.percent}%</b>
      </div>
      <div className="h-4 w-full overflow-hidden border border-border bg-muted">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  ) : null;

  return { run, running, bar };
}
