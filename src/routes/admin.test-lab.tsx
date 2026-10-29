import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Pause, Play, RefreshCw, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { useRef, useState } from "react";
import { Page, Msg, useAdmin } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/test-lab")({
  head: () => ({ meta: [{ title: "Test Lab — Life OS Admin" }, { name: "description", content: "Run one simulated business day of commission settlement and reset 300 test members." }, { property: "og:title", content: "Test Lab — Life OS Admin" }, { property: "og:description", content: "Run one simulated business day of commission settlement and reset 300 test members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TestLab,
});

type Status = { enabled: boolean; simulated_date: string | null; today: string; days_run: number; root_life_id: string | null; members: number; paid_activations: number; waiting_settlement: number; settled: number; statements_closed: number; totals: Record<string, number>; matching_flushed: number; job: Job | null; daily: Daily[]; last_day: { settled_date: string; next_date: string; processed: number; statements_closed: number; failed: number } | null };
type Job = { members: number; days: number; day: number; created: number; phase: "seed" | "settle" | "done"; start_date: string; failed?: number };
type Daily = { day: string; sales: number; cashback: number; referral: number; generation: number; matching: number };
const tk = (n: number) => `৳${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function TestLab() {
  const q = useAdmin<Status>("test-lab", "/test-lab");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const s = q.data;
  const act = async (label: string, path: string, body: unknown, confirmText?: string) => {
    if (confirmText && window.prompt(confirmText) !== "RESET") { setMsg("Cancelled — type RESET to confirm."); return; }
    setBusy(true); setMsg(`${label}…`);
    try {
      const r = await adminApi<{ settled_date?: string; next_date?: string; processed?: number; statements_closed?: number; failed?: number; created?: number; usernames?: string; password?: string; removed_accounts?: number }>(path, { method: "POST", body });
      if (path.endsWith("run-day")) setMsg(`Settled ${r.settled_date}: ${r.processed} activations, ${r.statements_closed} statements closed, ${r.failed} failed. Software date is now ${r.next_date}.`);
      else if (r.created) setMsg(`${r.created} paid test members created (usernames ${r.usernames}, password ${r.password}). No commission yet — press Run 1 Day.`);
      else setMsg(`Removed ${r.removed_accounts} accounts. ROOT kept, all commission data cleared.`);
      await q.refetch();
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  };
  const running = useRef(false);
  const [looping, setLooping] = useState(false);
  const [members, setMembers] = useState(10000);
  const [days, setDays] = useState(30);
  // Each request does ~25 seconds of work; the page keeps calling until the month is finished.
  const loop = async () => {
    running.current = true; setLooping(true);
    try {
      for (;;) {
        if (!running.current) { setMsg("Paused. Press Continue to resume from the same point."); break; }
        try {
          const r = await adminApi<{ job: Job }>("/test-lab/month/step", { method: "POST", body: {} });
          const j = r.job;
          setMsg(j.phase === "done" ? `Month run finished: ${j.created} members, ${j.days} days settled, ${j.failed ?? 0} failed.` : `Day ${j.day + 1} of ${j.days} — ${j.phase === "seed" ? "members joining" : "cron settling"} (${j.created.toLocaleString()} members so far)…`);
          await q.refetch();
          if (j.phase === "done") break;
        } catch (e) {
          const m = (e as Error).message;
          if (/busy|already running|524|timeout|fetch/i.test(m)) { await new Promise((ok) => setTimeout(ok, 5000)); continue; }
          setMsg(m); break;
        }
      }
    } finally { running.current = false; setLooping(false); }
  };
  const startMonth = async () => {
    if (window.prompt(`Delete all accounts except ROOT, then let ${members.toLocaleString()} members join over ${days} days with daily cron settlement? Type RESET`) !== "RESET") { setMsg("Cancelled — type RESET to confirm."); return; }
    setBusy(true); setMsg("Resetting and starting month run…");
    try { await adminApi("/test-lab/month/start", { method: "POST", body: { confirm: "RESET", members, days } }); await q.refetch(); }
    catch (e) { setMsg((e as Error).message); setBusy(false); return; }
    setBusy(false); void loop();
  };
  const total = s ? Object.values(s.totals).reduce((a, b) => a + b, 0) : 0;
  return <Page title="Test Lab (1-Day Run)">
    <Msg text={q.error ? (q.error as Error).message : msg} />
    <Button variant="outline" size="sm" disabled={busy} onClick={() => void q.refetch()}><RefreshCw />Refresh</Button>
    {s && !s.enabled && <p className="py-4 text-destructive">Test Lab is turned off on this server (test_lab_enabled).</p>}
    {s && s.enabled && <div className="space-y-5 py-4 text-foreground">
      <dl className="grid grid-cols-[200px_1fr] gap-2">
        <dt>Software date</dt><dd><b>{s.today}</b>{s.simulated_date ? " (test clock)" : " (real clock)"}</dd>
        <dt>Days run</dt><dd>{s.days_run}</dd>
        <dt>ROOT</dt><dd>{s.root_life_id ?? "missing"}</dd>
        <dt>Members (without ROOT)</dt><dd>{s.members}</dd>
        <dt>Paid activations</dt><dd>{s.paid_activations} — settled {s.settled}, waiting {s.waiting_settlement}</dd>
        <dt>Statements closed</dt><dd>{s.statements_closed}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || looping} onClick={() => void act("Running 1 day", "/test-lab/run-day", {})}><Play />Run 1 Day (settle {s.today})</Button>
        <Button variant="outline" disabled={busy || looping} onClick={() => void act("Resetting", "/test-lab/reset", { confirm: "RESET", seed: true }, "Delete all accounts except ROOT and create 300 fresh paid test members? Type RESET")}><RotateCcw />Reset + 300 Members</Button>
        <Button variant="outline" disabled={busy || s.members > 0} onClick={() => void act("Creating", "/test-lab/seed", {})}><UserPlus />Create 300 Members</Button>
        <Button variant="destructive" disabled={busy || looping} onClick={() => void act("Deleting", "/test-lab/reset", { confirm: "RESET" }, "Delete ALL accounts except ROOT and ALL commission/transaction data? Type RESET")}><Trash2 />Delete All (keep ROOT)</Button>
      </div>
      <div className="space-y-2 border border-border p-3">
        <h3 className="flex items-center gap-2 font-bold"><CalendarDays className="size-4" />1 Month Run</h3>
        <p className="text-sm">Members join every day (members ÷ days per day) and the real commission cron settles each day, then the software moves to the next day.</p>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="grid gap-1">Members<input type="number" min={1} max={20000} value={members} onChange={(e) => setMembers(Number(e.target.value))} className="w-28 border border-input px-2 py-1" /></label>
          <label className="grid gap-1">Days<input type="number" min={1} max={62} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-20 border border-input px-2 py-1" /></label>
          <Button disabled={busy || looping} onClick={() => void startMonth()}><CalendarDays />Reset + Start Month</Button>
          {s.job && s.job.phase !== "done" && !looping && <Button variant="outline" disabled={busy} onClick={() => void loop()}><Play />Continue</Button>}
          {looping && <Button variant="outline" onClick={() => { running.current = false; }}><Pause />Pause</Button>}
        </div>
        {s.job && <>
          <p className="text-sm">Progress: day <b>{Math.min(s.job.day + (s.job.phase === "done" ? 0 : 1), s.job.days)}</b> / {s.job.days} — {s.job.created.toLocaleString()} / {s.job.members.toLocaleString()} members — {s.job.phase === "done" ? "finished" : s.job.phase === "seed" ? "members joining" : "cron settling"}{s.job.failed ? `, ${s.job.failed} failed` : ""}</p>
          <div className="h-3 w-full max-w-lg bg-muted"><div className="h-3 bg-primary" style={{ width: `${Math.round(((s.job.day + (s.job.phase === "settle" ? 0.5 : 0)) / s.job.days) * 100)}%` }} /></div>
        </>}
        {s.daily.length > 0 && <div className="max-h-80 overflow-auto"><table className="w-full border border-border text-xs"><thead><tr className="bg-primary text-primary-foreground"><th className="p-1 text-left">Date</th><th className="p-1 text-right">Sales</th><th className="p-1 text-right">Cashback</th><th className="p-1 text-right">Referral</th><th className="p-1 text-right">Generation</th><th className="p-1 text-right">Matching</th></tr></thead>
          <tbody>{s.daily.map((d) => <tr key={d.day} className="border-t border-border"><td className="p-1">{d.day}</td><td className="p-1 text-right">{d.sales}</td><td className="p-1 text-right">{tk(Number(d.cashback))}</td><td className="p-1 text-right">{tk(Number(d.referral))}</td><td className="p-1 text-right">{tk(Number(d.generation))}</td><td className="p-1 text-right">{tk(Number(d.matching))}</td></tr>)}</tbody></table></div>}
      </div>
      {s.last_day && <p>Last run: settled {s.last_day.settled_date} → {s.last_day.processed} activations, {s.last_day.statements_closed} statements, {s.last_day.failed} failed. Next: {s.last_day.next_date}.</p>}
      <table className="w-full max-w-lg border border-border text-sm"><thead><tr className="bg-primary text-primary-foreground"><th className="p-1 text-left">Commission</th><th className="p-1 text-right">Paid</th></tr></thead>
        <tbody>{Object.entries(s.totals).map(([k, v]) => <tr key={k} className="border-t border-border"><td className="p-1">{k}</td><td className="p-1 text-right">{tk(v)}</td></tr>)}
          <tr className="border-t border-border font-bold"><td className="p-1">Total</td><td className="p-1 text-right">{tk(total)}</td></tr>
          <tr className="border-t border-border"><td className="p-1">Matching flushed events</td><td className="p-1 text-right">{s.matching_flushed}</td></tr></tbody></table>
      <p>Each Run 1 Day uses the real commission cron for the current software date, then moves the software to the next day (previous day statements close at its midnight). Test members log in as test1…test{s.members} with password test1234.</p>
    </div>}
  </Page>;
}
