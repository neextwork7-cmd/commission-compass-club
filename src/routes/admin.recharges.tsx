import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page, DataTable, Msg, fmtDate, useAdmin } from "@/components/admin-kit";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/recharges")({
  head: () => ({ meta: [{ title: "Mobile Recharges — Life OS Admin" }, { name: "description", content: "Release or reject member mobile recharge requests." }, { property: "og:title", content: "Mobile Recharges — Life OS Admin" }, { property: "og:description", content: "Release or reject member mobile recharge requests." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Recharges,
});

type Row = { id: number; recharge_code: string; operator: string; phone: string; amount: number; status: string; admin_note: string | null; created_at: string; processed_at: string | null; life_id: string; member_phone: string };
const OPERATOR: Record<string, string> = { GP: "GrameenPhone", BL: "Banglalink", RB: "Robi", AT: "Airtel", TT: "Teletalk" };

function Recharges() {
  const q = useAdmin<Row[]>("recharges", "/recharges");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string | null }>({ text: null });
  const rows = (q.data ?? []).filter((r) => !status || r.status === status);

  const process = async (id: number, st: string) => {
    setMsg({ text: null });
    setBusy(id);
    try {
      await adminApi(`/recharges/${id}/process`, { body: { status: st, note: notes[id] || undefined } });
      setMsg({ ok: true, text: `Recharge ${st.toLowerCase()}.` });
      await q.refetch();
    } catch (x) { setMsg({ text: (x as Error).message }); }
    finally { setBusy(null); }
  };

  return (
    <Page title="Mobile Recharges" center>
      <p style={{ margin: "10px 0", textAlign: "center" }}>
        <b>Status:</b>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ marginLeft: 8 }}>
          <option value="">All</option>
          {["PENDING", "PAID", "REJECTED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </p>
      <Msg {...msg} />
      {q.error ? <p style={{ color: "#C00", fontWeight: 600 }}>{(q.error as Error).message}</p> : (
        <DataTable
          head={["Sl", "Date", "Life ID", "Operator", "Mobile Number", "Amount", "Status", "Action"]}
          rows={rows.map((r, i) => [
            i + 1, fmtDate(r.created_at), r.life_id, OPERATOR[r.operator] ?? r.operator, r.phone, r.amount,
            <b key="s" style={{ color: r.status === "PAID" ? "#009541" : r.status === "PENDING" ? "#B8860B" : "#C00" }}>{r.status}</b>,
            r.status === "PENDING" ? (
              <span key="a">
                <input aria-label={`Admin note for recharge ${r.id}`} maxLength={255} placeholder="Admin note" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                <button type="button" disabled={busy !== null} onClick={() => process(r.id, "PAID")} style={{ padding: "2px 10px", marginRight: 4 }}>Mark Paid</button>
                <button type="button" disabled={busy !== null} onClick={() => process(r.id, "REJECTED")} style={{ padding: "2px 10px" }}>Reject</button>
              </span>
            ) : r.admin_note ?? "—",
          ])}
        />
      )}
      {!q.error && !q.isLoading && rows.length === 0 && <Msg text="No recharge requests found." />}
    </Page>
  );
}
