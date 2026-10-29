import { useEffect, useRef, useState } from "react";
import { adminApi } from "@/lib/admin-api";

type Progress = { action: string; id?: string; done: number; total: number; percent: number } | null;
export type DayResult = { settled_date: string; next_date: string; processed: number; statements_closed: number; failed: number };

/**
 * Settles the software date in ~40-second server slices (each request stays under the host proxy limit)
 * until the server reports the day finished and the date moved forward.
 */
export async function settleDay(runId: string): Promise<DayResult> {
  for (;;) {
    const r = await adminApi<DayResult & { partial?: boolean }>("/test-lab/run-day", { method: "POST", body: { run_id: runId } });
    if (!r.partial) return r;
  }
}

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

  const run = async <T,>(action: keyof typeof ACTION_LABELS, call: (runId: string) => Promise<T>): Promise<T> => {
    setRunning(action);
    setProgress({ action, done: 0, total: 1, percent: 0 });
    // Server clocks can drift, so progress records are matched by this id instead of by time.
    const runId = `${action}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    timer.current = window.setInterval(async () => {
      try {
        const p = await adminApi<Progress>("/test-lab/progress");
        // Ignore records left by an earlier action.
        if (p && p.action === action && p.id === runId) setProgress(p);
      } catch { /* keep the last value */ }
    }, 1000);
    try {
      const out = await call(runId);
      setProgress((p) => ({ action, done: p?.total ?? 1, total: p?.total ?? 1, percent: 100 }));
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
