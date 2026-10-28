import { createFileRoute } from "@tanstack/react-router";
import { Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Page, Msg, useAdmin } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { ADMIN_API_BASE } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/cron")({
  head: () => ({ meta: [{ title: "Cron Setup — Life OS Admin" }, { name: "description", content: "Commission scheduler status and cPanel cron setup for Life OS." }, { property: "og:title", content: "Cron Setup — Life OS Admin" }, { property: "og:description", content: "Commission scheduler status and cPanel cron setup for Life OS." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CronSetup,
});

type Status = { url: string | null; endpoint_path: string; schedule: string; timezone: string; server_enabled: boolean; finance_approved: boolean; mode: string; cli_command: string; url_command: string; last_run: { at: string; result: { status: string; failed?: number } } | null };
function CronSetup() {
  const q = useAdmin<Status>("cron", "/cron");
  const [message, setMessage] = useState<string | null>(null);
  const data = q.data;
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