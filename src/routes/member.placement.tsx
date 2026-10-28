import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Page, useMember } from "@/components/member-kit";

export const Route = createFileRoute("/member/placement")({
  head: () => ({ meta: [{ title: "Placement Team & Income — Life OS Member" }, { name: "description", content: "All members under your placement with Binary and Enrollment matching income." }, { property: "og:title", content: "Placement Team & Income — Life OS Member" }, { property: "og:description", content: "All members under your placement with Binary and Enrollment matching income." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Placement,
});

type Row = { id: number; life_id: string; full_name?: string; created_at: string; is_active: number | string; level: number; leg: "L" | "R"; binary_bill: string; enrollment_bill: string; paid: string };
type Day = { day: string; binary_total: string; enrollment_total: string; paid: string; events: number };
const tk = (v: string | number) => `৳${Number(v).toFixed(3)}`;

function Placement() {
  const q = useMember<{ members: Row[]; daily: Day[] }>("placement", "/placement");
  const rows = q.data?.members ?? [];
  const daily = q.data?.daily ?? [];
  const left = rows.filter((r) => r.leg === "L").length;
  return (
    <Page title="Placement Team">
      <div style={{ overflowX: "auto", whiteSpace: "nowrap", padding: "8px 0" }} role="region" aria-label="Placement members" tabIndex={0}>
        {rows.length === 0 && <span className="error">No placement member found.</span>}
        {rows.map((r) => (
          <div key={r.id} style={{ display: "inline-block", verticalAlign: "top", width: 150, margin: "0 4px", border: "1px solid var(--lo-tree-link)", padding: 6, textAlign: "center", whiteSpace: "normal" }}>
            <b>{r.life_id}</b><br />{r.full_name ?? ""}<br />
            Level {r.level} · {r.leg === "L" ? "Left" : "Right"}<br />
            {Number(r.is_active) ? "Active" : "Inactive"}<br />
            Binary {tk(r.binary_bill)}<br />Placement {tk(r.enrollment_bill)}<br /><b>Paid {tk(r.paid)}</b>
          </div>
        ))}
      </div>
      <DataTable
        caption={<> Daily Matching — each matching pays only the higher of Binary / Placement bill (Left {left}, Right {rows.length - left}) </>}
        head={["Date", "Binary Bill", "Placement Bill", "Paid (one bill per matching)", "Events"]}
        rows={daily.map((d) => [d.day, tk(d.binary_total), tk(d.enrollment_total), tk(d.paid), d.events])}
      />
    </Page>
  );
}
