import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Play, RefreshCw, RotateCcw, UserPlus } from "lucide-react";
import { useState } from "react";
import { Page, Msg, useAdmin } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/admin-api";
import { MATCHING_TYPE_LABELS, MATCHING_TYPES, type MatchingSplit } from "@/lib/matching-split";

export const Route = createFileRoute("/admin/test-lab")({
  head: () => ({ meta: [{ title: "Test Lab — Life OS Admin" }, { name: "description", content: "Create 300 test members, settle one simulated business day at a time and reset to today." }, { property: "og:title", content: "Test Lab — Life OS Admin" }, { property: "og:description", content: "Create 300 test members, settle one simulated business day at a time and reset to today." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TestLab,
});

type Status = { enabled: boolean; simulated_date: string | null; today: string; days_run: number; root_life_id: string | null; members: number; paid_activations: number; waiting_settlement: number; settled: number; statements_closed: number; totals: Record<string, number>; matching_flushed: number; daily: Daily[]; matching_split?: MatchingSplit; ranks?: { name: string; required_matchings: number; achieved: number | string }[]; top_matchings?: { username: string; life_id: string; lifetime_matchings: number }[]; last_day: { settled_date: string; next_date: string; processed: number; statements_closed: number; failed: number } | null };
type Daily = { day: string; sales: number; cashback: number; referral: number; generation: number; matching: number };
type Login = { username: string; life_id: string; name: string | null; sponsor: string | null; side: string | null; settled: number | string };
const tk = (n: number) => `৳${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function TestLab() {
  const q = useAdmin<Status>("test-lab", "/test-lab");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [logins, setLogins] = useState<Login[] | null>(null);
  const s = q.data;

  const loadLogins = async () => {
    try { setLogins((await adminApi<{ members: Login[] }>("/test-lab/logins")).members); }
    catch (e) { setMsg((e as Error).message); }
  };

  const runDay = async () => {
    setBusy(true); setMsg("Running 1 day settlement…");
    try {
      const r = await adminApi<{ settled_date: string; next_date: string; processed: number; statements_closed: number; failed: number }>("/test-lab/run-day", { method: "POST", body: {} });
      setMsg(`Settled ${r.settled_date}: ${r.processed} activations, ${r.statements_closed} statements closed, ${r.failed} failed. Software date is now ${r.next_date}.`);
      await q.refetch();
      if (logins) await loadLogins();
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (window.prompt("Delete ALL accounts except ROOT and ALL commission/transaction data, and set the software date back to today? Type RESET") !== "RESET") { setMsg("Cancelled — type RESET to confirm."); return; }
    setBusy(true); setMsg("Resetting…");
    try {
      const r = await adminApi<{ removed_accounts: number }>("/test-lab/reset", { method: "POST", body: { confirm: "RESET" } });
      setLogins(null);
      setMsg(`Removed ${r.removed_accounts} accounts. ROOT kept, all commission data cleared, software date set to today. Press Create 300 Members next.`);
      await q.refetch();
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  };

  const create = async () => {
    setBusy(true); setMsg("Creating 300 paid test members…");
    try {
      const r = await adminApi<{ created: number; usernames: string; password: string; logins: Login[] }>("/test-lab/seed", { method: "POST", body: {} });
      setLogins(r.logins);
      setMsg(`${r.created} paid test members created (usernames ${r.usernames}, password ${r.password}). Nothing settled yet — press Run 1 Day.`);
      await q.refetch();
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  };

  const total = s ? Object.values(s.totals).reduce((a, b) => a + b, 0) : 0;
  return <Page title="Test Lab (1-Day Run)">
    <Msg text={q.error ? (q.error as Error).message : msg} />
    <Button variant="outline" size="sm" disabled={busy} onClick={() => void q.refetch()}><RefreshCw />Refresh</Button>
    {s && !s.enabled && <p className="py-4 text-destructive">Test Lab is turned off on this server (test_lab_enabled).</p>}
    {s && s.enabled && <div className="space-y-5 py-4 text-foreground">
      <dl className="grid grid-cols-[200px_1fr] gap-2">
        <dt>Software date</dt><dd><b>{s.today}</b> (used by the whole software: commission, statements, member panel)</dd>
        <dt>Days run</dt><dd>{s.days_run}</dd>
        <dt>ROOT</dt><dd>{s.root_life_id ?? "missing"}</dd>
        <dt>Members (without ROOT)</dt><dd>{s.members}</dd>
        <dt>Paid activations</dt><dd>{s.paid_activations} — settled {s.settled}, waiting {s.waiting_settlement}</dd>
        <dt>Statements closed</dt><dd>{s.statements_closed}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || s.members === 0} onClick={() => void runDay()}><Play />Run 1 Day (settle {s.today})</Button>
        <Button variant="outline" disabled={busy || s.members > 0} onClick={() => void create()}><UserPlus />Create 300 Members</Button>
        <Button variant="destructive" disabled={busy} onClick={() => void reset()}><RotateCcw />Reset (keep ROOT, date → today)</Button>
        <Button variant="outline" disabled={busy || s.members === 0} onClick={() => void loadLogins()}><KeyRound />Show Member Logins</Button>
      </div>
      <p className="text-sm">Steps: 1) Reset → everything cleared, date = today, nothing settled. 2) Create 300 Members → paid members, no commission yet. 3) Run 1 Day → the real commission cron settles the software date, then the whole software moves to the next day. Press again for every next day.</p>
      {s.last_day && <p>Last run: settled {s.last_day.settled_date} → {s.last_day.processed} activations, {s.last_day.statements_closed} statements, {s.last_day.failed} failed. Next: {s.last_day.next_date}.</p>}
      <table className="w-full max-w-lg border border-border text-sm"><thead><tr className="bg-primary text-primary-foreground"><th className="p-1 text-left">Commission</th><th className="p-1 text-right">Paid</th></tr></thead>
        <tbody>{Object.entries(s.totals).map(([k, v]) => <tr key={k} className="border-t border-border"><td className="p-1">{k}</td><td className="p-1 text-right">{tk(v)}</td></tr>)}
          {s.matching_split && MATCHING_TYPES.map((m) => <tr key={m} className="border-t border-border"><td className="p-1 pl-5">• {MATCHING_TYPE_LABELS[m]} ({s.matching_split![m].paid_events} paid / {s.matching_split![m].flushed_events} flushed)</td><td className="p-1 text-right">{tk(s.matching_split![m].paid)}</td></tr>)}
          <tr className="border-t border-border font-bold"><td className="p-1">Total</td><td className="p-1 text-right">{tk(total)}</td></tr>
          <tr className="border-t border-border"><td className="p-1">Matching flushed events</td><td className="p-1 text-right">{s.matching_flushed}</td></tr></tbody></table>
      {s.ranks && <div className="flex flex-wrap gap-6">
        <table className="border border-border text-sm"><thead><tr className="bg-primary text-primary-foreground"><th className="p-1 text-left">Rank</th><th className="p-1 text-right">Needs matchings</th><th className="p-1 text-right">Achieved</th></tr></thead>
          <tbody>{s.ranks.map((r) => <tr key={r.name} className="border-t border-border"><td className="p-1">{r.name}</td><td className="p-1 text-right">{Number(r.required_matchings).toLocaleString("en-IN")}</td><td className="p-1 text-right">{r.achieved}</td></tr>)}</tbody></table>
        {s.top_matchings && <table className="border border-border text-sm"><thead><tr className="bg-primary text-primary-foreground"><th className="p-1 text-left">Top member</th><th className="p-1 text-left">Life ID</th><th className="p-1 text-right">Lifetime matchings</th></tr></thead>
          <tbody>{s.top_matchings.map((t) => <tr key={t.life_id} className="border-t border-border"><td className="p-1">{t.username ?? "ROOT"}</td><td className="p-1">{t.life_id}</td><td className="p-1 text-right">{t.lifetime_matchings}</td></tr>)}</tbody></table>}
      </div>}
      {s.daily.length > 0 && <table className="w-full border border-border text-xs"><thead><tr className="bg-primary text-primary-foreground"><th className="p-1 text-left">Settled date</th><th className="p-1 text-right">Sales</th><th className="p-1 text-right">Cashback</th><th className="p-1 text-right">Referral</th><th className="p-1 text-right">Generation</th><th className="p-1 text-right">Matching</th></tr></thead>
        <tbody>{s.daily.map((d) => <tr key={d.day} className="border-t border-border"><td className="p-1">{d.day}</td><td className="p-1 text-right">{d.sales}</td><td className="p-1 text-right">{tk(Number(d.cashback))}</td><td className="p-1 text-right">{tk(Number(d.referral))}</td><td className="p-1 text-right">{tk(Number(d.generation))}</td><td className="p-1 text-right">{tk(Number(d.matching))}</td></tr>)}</tbody></table>}
      {logins && <div className="space-y-2">
        <h3 className="font-bold">Member Login Info — password for every test member: <span className="font-mono">test1234</span></h3>
        <div className="max-h-96 overflow-auto"><table className="w-full border border-border text-xs"><thead className="sticky top-0"><tr className="bg-primary text-primary-foreground"><th className="p-1 text-left">Username</th><th className="p-1 text-left">Password</th><th className="p-1 text-left">Life ID</th><th className="p-1 text-left">Name</th><th className="p-1 text-left">Sponsor</th><th className="p-1 text-left">Side</th><th className="p-1 text-left">Settled</th></tr></thead>
          <tbody>{logins.map((m) => <tr key={m.life_id} className="border-t border-border"><td className="p-1 font-mono">{m.username}</td><td className="p-1 font-mono">test1234</td><td className="p-1">{m.life_id}</td><td className="p-1">{m.name}</td><td className="p-1">{m.sponsor}</td><td className="p-1">{m.side}</td><td className="p-1">{Number(m.settled) ? "Yes" : "No"}</td></tr>)}</tbody></table></div>
      </div>}
    </div>}
  </Page>;
}
