import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, DateFilter, fmtDate, inRange, Page, useMember } from "@/components/member-kit";
import { bdt, LEDGER_LABELS } from "@/lib/member-api";

export const Route = createFileRoute("/member/commission")({
  head: () => ({ meta: [{ title: "Bonus Report — Life OS Member" }, { name: "description", content: "Life OS member bonus report." }, { property: "og:title", content: "Bonus Report — Life OS Member" }, { property: "og:description", content: "Life OS member bonus report." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Commission,
});

type Row = { payout_code: string; ledger_type: string; amount: number; level: number | null; status: string; created_at: string };

function Commission() {
  const [type, setType] = useState("All");
  const [applied, setApplied] = useState({ from: "", to: "", type: "All" });
  const q = useMember<Row[]>(`ledger-${applied.type}`, applied.type === "All" ? "/ledger" : `/ledger?type=${applied.type}`);
  const rows = (q.data ?? []).filter((r) => inRange(r.created_at, applied));
  const right = (v: string) => <span style={{ display: "block", textAlign: "right" }}>{v}</span>;
  return (
    <Page title="Commission List" center>
      <DateFilter onApply={(r) => setApplied({ ...r, type })}>
        <b style={{ marginLeft: 20 }}>Report Type:</b>{" "}
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 140 }}>
          <option value="All">All</option>
          {Object.entries(LEDGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>{" "}
      </DateFilter>
      <DataTable
        style={{ marginTop: 20 }}
        head={["Sl", "Date & Time", "Reference", "Bonus Type", "Status", "Bonus Amount"]}
        rows={rows.map((r, i) => [
          i + 1, fmtDate(r.created_at), r.payout_code,
          `${LEDGER_LABELS[r.ledger_type] ?? r.ledger_type}${r.level ? ` [${r.level}]` : ""}`, r.status,
          right(bdt(r.amount)),
        ])}
        footSpan={5}
        foot={rows.length ? ["All Total", bdt(rows.reduce((a, r) => a + Number(r.amount), 0))] : undefined}
      />
    </Page>
  );
}
