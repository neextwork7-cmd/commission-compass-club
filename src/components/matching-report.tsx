import { useState } from "react";
import { DataTable, DateFilter, fmtDate, inRange, Page, useMember } from "@/components/member-kit";
import { bdt } from "@/lib/member-api";

/** Marketing-plan matching rules (display only; the PHP engine enforces them). */
export const MATCHING_SCHEDULE = [150, 75, 37.5, 18.75, 9.375, 4.6875, 2.34375, 1.171875, 0.5859375, 0.29296875, 0.146484375];
export const MATCHING_RESERVE = 300;
export const MATCHING_LIMIT = 299.854;
export const DAILY_CAP = 5000;

type Event = {
  event_code: string; sale_id: number; event_number: number; selected_type: "BINARY" | "ENROLLMENT";
  enrollment_bill?: string; binary_bill?: string; calculated_payout: string; actual_payout: string;
  reserve_after?: string; daily_after?: string; payout_status: string; note?: string | null; created_at: string;
};

const n3 = (v: unknown) => `৳${(Number(v) || 0).toFixed(3)}`;
const right = (v: string) => <span style={{ display: "block", textAlign: "right" }}>{v}</span>;
const box = { border: "1px solid #ccc", borderRadius: 8, padding: 10, background: "rgba(255,255,255,0.9)", fontSize: 12, textAlign: "left" } as const;

export function MatchingReport({ type, title }: { type: "BINARY" | "ENROLLMENT"; title: string }) {
  const [applied, setApplied] = useState({ from: "", to: "" });
  const q = useMember<Event[]>("matching", "/matching");
  const rows = (q.data ?? []).filter((r) => r.selected_type === type && inRange(r.created_at, applied));
  const paid = rows.filter((r) => r.payout_status === "PAID");
  const flushed = rows.filter((r) => r.payout_status === "FLUSHED");
  const sum = (list: Event[], k: "actual_payout" | "calculated_payout") => list.reduce((a, r) => a + Number(r[k]), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayPaid = (q.data ?? []).filter((r) => r.payout_status === "PAID" && r.created_at.slice(0, 10) === today).reduce((a, r) => a + Number(r.actual_payout), 0);
  const rule = type === "BINARY"
    ? "Binary Tree: placement Left/Right volume 1:1 pair. Strong-side extra volume stays as Carry for the next matching."
    : "Enrollment Tree: sponsor tree — your two biggest direct legs pair 1:1. Unpaired leg volume stays as Carry.";

  return (
    <Page title={title} center>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, margin: "0 0 14px" }}>
        <div style={box}>
          <b>Plan Rules</b>
          <div>{rule}</div>
          <div>Each sale: max {MATCHING_SCHEDULE.length} matchings, reserve ৳{MATCHING_RESERVE} (max paid ৳{MATCHING_LIMIT}).</div>
          <div>Binary & Enrollment bills both calculated — only the higher ONE is paid per matching.</div>
          <div>Daily cap ৳{DAILY_CAP.toLocaleString()} (Binary + Enrollment together); extra is flushed.</div>
        </div>
        <div style={box}>
          <b>Payout Schedule (per sale)</b>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 10 }}>
            {MATCHING_SCHEDULE.map((v, i) => <span key={i}>#{i + 1}: ৳{v.toFixed(3)}</span>)}
          </div>
        </div>
        <div style={box}>
          <b>Summary</b>
          <div>Paid events: {paid.length} — {bdt(sum(paid, "actual_payout"))}</div>
          <div>Flushed events: {flushed.length} — {bdt(sum(flushed, "calculated_payout"))}</div>
          <div>Today paid (all matching): {bdt(todayPaid)} / ৳{DAILY_CAP.toLocaleString()}</div>
          <div>Today remaining cap: {bdt(Math.max(0, DAILY_CAP - todayPaid))}</div>
        </div>
      </div>
      <DateFilter onApply={setApplied} />
      <DataTable
        style={{ marginTop: 20 }}
        head={["Sl", "Date & Time", "Sale", "Matching No", "Enrollment Bill", "Binary Bill", "Schedule", "Paid", "Reserve Left", "Status"]}
        rows={rows.map((r, i) => [
          i + 1, fmtDate(r.created_at), `#${r.sale_id}`, `${r.event_number} / ${MATCHING_SCHEDULE.length}`,
          right(n3(r.enrollment_bill)), right(n3(r.binary_bill)), right(n3(r.calculated_payout)), right(n3(r.actual_payout)),
          right(n3(r.reserve_after)), r.payout_status === "FLUSHED" ? `FLUSHED${r.note ? ` (${r.note})` : ""}` : r.payout_status,
        ])}
        footSpan={7}
        foot={rows.length ? ["All Total", bdt(sum(paid, "actual_payout")), "", ""] : undefined}
      />
    </Page>
  );
}
