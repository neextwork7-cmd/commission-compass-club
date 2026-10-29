import { createFileRoute } from "@tanstack/react-router";
import { Copy, Play, RefreshCw, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Page, Msg, useAdmin } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { ADMIN_API_BASE, adminApi } from "@/lib/admin-api";
import { useTestLabAction } from "@/components/test-lab-actions";
import { bdt } from "@/lib/member-api";
import { MATCHING_TYPE_LABELS, MATCHING_TYPES, type MatchingSplit } from "@/lib/matching-split";

export const Route = createFileRoute("/admin/cron")({
  head: () => ({ meta: [{ title: "Cron Setup — Life OS Admin" }, { name: "description", content: "Commission scheduler status and cPanel cron setup for Life OS." }, { property: "og:title", content: "Cron Setup — Life OS Admin" }, { property: "og:description", content: "Commission scheduler status and cPanel cron setup for Life OS." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CronSetup,
});

type Status = { url: string | null; endpoint_path: string; schedule: string; timezone: string; server_enabled: boolean; finance_approved: boolean; mode: string; cli_command: string; url_command: string; last_run: { at: string; result: { status: string; failed?: number } } | null; software_date?: string; matching_total?: MatchingSplit; matching_today?: MatchingSplit; matching_last_day?: MatchingSplit };
function CronSetup() {
  const q = useAdmin<Status>("cron", "/cron");
  const [message, setMessage] = useState<string | null>(null);
  const data = q.data;
  const lab = useTestLabAction();
  // Test Lab shortcuts: add one day of new sales, then settle that day with the real cron engine.
  const addSales = async () => {
    setMessage(null);
    try {
      const r = await lab.run("sales", () => adminApi<{ added: number; from: string; to: string; date: string; waiting: number }>("/test-lab/add-sales", { method: "POST", body: {} }));
      setMessage(`${r.added} new sales added on ${r.date} (${r.from} … ${r.to}, password test1234). ${r.waiting} waiting — press Run 1 Day Settle.`);
      await q.refetch();
    } catch (e) { setMessage((e as Error).message); }
  };
  const runDay = async () => {
    setMessage(null);
    try {
      const r = await lab.run("run", () => adminApi<{ settled_date: string; next_date: string; processed: number; statements_closed: number; failed: number }>("/test-lab/run-day", { method: "POST", body: {} }));
      setMessage(`Settled ${r.settled_date}: ${r.processed} activations, ${r.statements_closed} statements closed, ${r.failed} failed. Software date is now ${r.next_date}.`);
      await q.refetch();
    } catch (e) { setMessage((e as Error).message); }
  };
  const cronUrl = data?.url ?? `${ADMIN_API_BASE}/public/cron/settle`;
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setMessage("Copied."); }
    catch { setMessage("Copy unavailable. Select and copy the value."); }
  };
  return <Page title="Cron Setup">
    <Msg text={q.error ? (q.error as Error).message : message} />
    <Button variant="outline" size="sm" onClick={() => void q.refetch()} title="Refresh scheduler status"><RefreshCw />Refresh</Button>
    {data && <div className="space-y-5 py-4 text-foreground">
      <dl className="grid grid-cols-[180px_1fr] gap-2">
        <dt>Payment execution</dt><dd>{data.server_enabled && data.finance_approved ? "Approved" : "Blocked — approval required"}</dd>
        <dt>URL mode</dt><dd>{data.mode}</dd><dt>Time zone</dt><dd>{data.timezone}</dd>
        <dt>Last URL invocation</dt><dd>{data.last_run ? `${data.last_run.at} — ${data.last_run.result.status}` : "No verified invocation"}</dd>
        <dt>Host schedule</dt><dd>Installation must be confirmed in cPanel.</dd>
      </dl>
      <div className="space-y-2 border border-border p-3">
        <h3 className="font-bold">Test Lab — 1 Day Sales &amp; Settlement (software date {data.software_date})</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={lab.running !== null} onClick={() => void addSales()}><ShoppingCart />Add 1 Day Sales (300)</Button>
          <Button disabled={lab.running !== null} onClick={() => void runDay()}><Play />Run 1 Day Settle</Button>
        </div>
        {lab.bar}
        <p className="text-sm">Add 1 Day Sales creates 300 new paid members and their ৳1,000 activation transactions on the software date, keeping all existing data; nothing is settled until Run 1 Day Settle.</p>
      </div>
      {data.matching_total && <>
        <h3>Matching by Type (cron settlement)</h3>
        <table className="w-full max-w-2xl border border-border text-sm"><thead><tr className="bg-primary text-primary-foreground"><th className="p-1 text-left">Matching Type</th><th className="p-1 text-right">Previous day</th><th className="p-1 text-right">Today ({data.software_date})</th><th className="p-1 text-right">All time</th><th className="p-1 text-right">Events (paid / flushed)</th></tr></thead>
          <tbody>{MATCHING_TYPES.map((m) => <tr key={m} className="border-t border-border"><td className="p-1">{MATCHING_TYPE_LABELS[m]}</td><td className="p-1 text-right">{bdt(data.matching_last_day?.[m].paid)}</td><td className="p-1 text-right">{bdt(data.matching_today?.[m].paid)}</td><td className="p-1 text-right"><b>{bdt(data.matching_total![m].paid)}</b></td><td className="p-1 text-right">{data.matching_total![m].paid_events} / {data.matching_total![m].flushed_events}</td></tr>)}</tbody></table>
      </>}
      <h3>Cron URL</h3>
      <div className="flex items-start gap-2"><code className="min-w-0 break-all">{cronUrl}</code><Button variant="outline" size="icon" title="Copy cron URL" aria-label="Copy cron URL" onClick={() => void copy(cronUrl)}><Copy /></Button></div>
      {!data.url && <p>Set cron_base_url to your HTTPS backend address in the private server configuration to display the complete URL.</p>}
      <p>POST requests require a fresh server-generated signature. Opening the URL or using an unsigned curl command is rejected.</p>
      <h3>cPanel → Advanced → Cron Jobs</h3>
      <ol className="list-decimal space-y-2 pl-6">
        <li>Select Once Per Minute: minute *, hour *, day *, month *, weekday *.</li>
        <li>Use the direct PHP command below, or the signed URL command after configuring cron_base_url.</li>
        <li>Confirm the PHP CLI path with your host. Save Add New Cron Job.</li>
        <li>Keep dry-run until historical reconciliation and Finance/Admin approval. Never place a password or signing key in the URL.</li>
      </ol>
      <h3>Direct PHP command</h3><Command text={data.cli_command} copy={copy} />
      <h3>Signed URL command</h3><Command text={data.url_command} copy={copy} />
      <p>Both commands recover verified, unprocessed payments. Daily statements close after Dhaka midnight. They do not generate commission merely because time passes.</p>
      <p>Live payout requires commission_cron_enabled=true and financial_release_approved=1 after approval. Signed URL execution additionally requires cron_http_execute=true. Existing paid history remains unchanged.</p>
    </div>}
  </Page>;
}
function Command({ text, copy }: { text: string; copy: (text: string) => Promise<void> }) {
  return <div className="flex items-start gap-2 border border-border bg-muted p-3"><code className="min-w-0 flex-1 break-all">{text}</code><Button variant="outline" size="icon" title="Copy command" aria-label={`Copy ${text.includes("cron-http") ? "signed URL" : "direct PHP"} command`} onClick={() => void copy(text)}><Copy /></Button></div>;
}