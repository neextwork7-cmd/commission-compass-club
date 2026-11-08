import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, DateFilter, fmtDate, inRange, Msg, Page, useMember } from "@/components/member-kit";
import { bdt } from "@/lib/member-api";

export const Route = createFileRoute("/member/transaction-report")({
  head: () => ({ meta: [{ title: "Active ID History — Life OS Member" }, { name: "description", content: "Deposit wallet and Active New ID package history." }, { property: "og:title", content: "Active ID History — Life OS Member" }, { property: "og:description", content: "Deposit wallet and Active New ID package history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Report,
});

type Row = { deposit_code: string; kind: "ADMIN_ADD" | "ACTIVATE_ID"; amount: string; note: string | null; created_at: string; direction: "SENT" | "RECEIVED"; from_life_id: string; to_life_id: string | null; activation_code: string | null; processed: number | null };

function Report() {
  const q = useMember<Row[]>("activate-id-history", "/activate-id/history");
  const [range, setRange] = useState({ from: "", to: "" });
  const rows = (q.data ?? []).filter((r) => inRange(r.created_at, range));
  const label = (r: Row) => r.kind === "ADMIN_ADD" ? "Deposit Added" : r.direction === "SENT" ? `Activated ${r.to_life_id}` : `Package activated by ${r.from_life_id}`;
  return (
    <Page title="Active ID History">
      <Msg text={q.error ? (q.error as Error).message : null} />
      <DateFilter onApply={setRange} />
      <DataTable head={["Sl No.", "Date & Time", "Details", "Reference", "Settlement", "Deposit Wallet"]}
        rows={rows.map((r, i) => [i + 1, fmtDate(r.created_at), label(r), r.activation_code ?? r.deposit_code,
          r.kind === "ACTIVATE_ID" ? (Number(r.processed) ? "Settled" : "Waiting for settlement") : "—",
          r.direction === "RECEIVED" ? "—" : bdt(r.amount)])} />
    </Page>
  );
}
