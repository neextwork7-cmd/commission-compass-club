import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, DateFilter, fmtDate, inRange, Msg, Page, useMember } from "@/components/member-kit";
import { bdt } from "@/lib/member-api";

export const Route = createFileRoute("/member/transaction-report")({
  head: () => ({ meta: [{ title: "Transfer Reports — Life OS Member" }, { name: "description", content: "Your outgoing Life OS balance transfers." }, { property: "og:title", content: "Transfer Reports — Life OS Member" }, { property: "og:description", content: "Your outgoing Life OS balance transfers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Report,
});

export type TransferRow = { transfer_code: string; amount: number; note: string | null; created_at: string; life_id: string; phone: string; name: string | null };

/** Reference transfer/receive report: date filter + `.table`. `sent` = the list of transfers sent by me. */
export function TransferReport({ title, path, keyName, sent }: { title: string; path: string; keyName: string; sent: boolean }) {
  const q = useMember<TransferRow[]>(keyName, path);
  const [range, setRange] = useState({ from: "", to: "" });
  const who = sent ? "Receiver" : "Sender";
  const rows = (q.data ?? []).filter((r) => inRange(r.created_at, range));
  return (
    <Page title={title}>
      <Msg text={q.error ? (q.error as Error).message : null} />
      <DateFilter onApply={setRange} />
      <DataTable head={["Sl No.", "Date & Time", `${who} User ID`, `${who} Full Name`, `${who} Contact No`, "Amount"]}
        rows={rows.map((r, i) => [i + 1, fmtDate(r.created_at), r.life_id, r.name ?? "", r.phone, bdt(r.amount)])} />
    </Page>
  );
}

function Report() {
  return <TransferReport title="Balance - Transfer Report" path="/transfers/out" keyName="transfers-out" sent />;
}
