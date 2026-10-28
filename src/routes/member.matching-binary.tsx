import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, DateFilter, fmtDate, inRange, Page, useMember } from "@/components/member-kit";
import { bdt } from "@/lib/member-api";

export const Route = createFileRoute("/member/matching-binary")({
  head: () => ({ meta: [{ title: "Binary Matching — Life OS Member" }, { name: "description", content: "Your Binary matching income events." }, { property: "og:title", content: "Binary Matching — Life OS Member" }, { property: "og:description", content: "Your Binary matching income events." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MatchingBinary,
});

type Event = { event_code: string; sale_id: number; event_number: number; selected_type: string; calculated_payout: string; actual_payout: string; payout_status: string; created_at: string };

function MatchingBinary() {
  const [applied, setApplied] = useState({ from: "", to: "" });
  const q = useMember<Event[]>("matching", "/matching");
  const rows = (q.data ?? []).filter((r) => r.selected_type === "BINARY" && inRange(r.created_at, applied));
  const right = (v: string) => <span style={{ display: "block", textAlign: "right" }}>{v}</span>;
  return (
    <Page title="Binary Matching" center>
      <DateFilter onApply={setApplied} />
      <DataTable
        style={{ marginTop: 20 }}
        head={["Sl", "Date & Time", "Event Code", "Matching No", "Calculated", "Paid", "Status"]}
        rows={rows.map((r, i) => [
          i + 1, fmtDate(r.created_at), r.event_code, r.event_number,
          right(bdt(Number(r.calculated_payout))), right(bdt(Number(r.actual_payout))), r.payout_status,
        ])}
        footSpan={5}
        foot={rows.length ? ["All Total", bdt(rows.reduce((a, r) => a + Number(r.actual_payout), 0))] : undefined}
      />
    </Page>
  );
}
