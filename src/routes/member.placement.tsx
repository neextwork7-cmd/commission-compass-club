import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, Page, useMember } from "@/components/member-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/member/placement")({
  head: () => ({ meta: [{ title: "Placement Team & Income — Life OS Member" }, { name: "description", content: "All members under your placement with Binary and Enrollment matching income." }, { property: "og:title", content: "Placement Team & Income — Life OS Member" }, { property: "og:description", content: "All members under your placement with Binary and Enrollment matching income." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Placement,
});

type Row = { id: number; life_id: string; full_name?: string; created_at: string; is_active: number | string; level: number; leg: "L" | "R"; binary_bill: string; enrollment_bill: string; paid: string };
type Day = { day: string; binary_total: string; enrollment_total: string; paid: string; events: number };
type ENode = {
  user_id: number; life_id: string; full_name?: string | null; created_at: string;
  active: boolean; purchased: number; directs: number; team_total: number; children: ENode[];
};
const tk = (v: string | number) => `৳${Number(v).toFixed(3)}`;

/** One horizontal-tree cell: photo button (tap opens the info box) + User ID link. */
function EPerson({ n, open, onToggle }: { n: ENode; open: boolean; onToggle: (id: number | null) => void }) {
  return (
    <span className={`lo-node${open ? " open" : ""}`} style={{ display: "inline-block", textAlign: "center" }}>
      <Button variant="reference" size="reference" type="button" className="lo-tree-control" aria-label={`Details for ${n.life_id}`} aria-expanded={open} aria-describedby={`enroll-info-${n.user_id}`} onClick={() => onToggle(open ? null : n.user_id)}>
        <img src="/member-kit/neel/blank.png" alt="" style={{ width: 64, opacity: n.active ? 0.9 : 0.6 }} />
      </Button>
      <br />
      <a href="#" onClick={(e) => { e.preventDefault(); onToggle(open ? null : n.user_id); }}>{n.life_id}</a>
      <span className="tooltip" id={`enroll-info-${n.user_id}`} role="tooltip" onClick={() => onToggle(null)}>
        <b>Full Name: <span>{n.full_name ?? ""}</span></b><br />
        <b>Joined: <span>{n.created_at.slice(0, 10)}</span></b><br />
        <b>Purchased: <span>{(Number(n.purchased) || 0).toFixed(2)}</span></b><br />
        <b>Direct Team: <span>{n.directs}</span></b><br />
        <b>Total Downline: <span>{n.team_total}</span></b><br />
        <b>Status: <span>{n.active ? "Active" : "Inactive"}</span></b><br />
      </span>
    </span>
  );
}

/** Renders one level of the enrollment downline horizontally, then the next level below it. */
function ELevel({ nodes, openId, onToggle }: { nodes: ENode[]; openId: number | null; onToggle: (id: number | null) => void }) {
  if (nodes.length === 0) return null;
  const next = nodes.flatMap((n) => n.children);
  return (
    <>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {nodes.map((n) => (
          <div key={n.user_id} style={{ textAlign: "center", minWidth: 90 }}>
            <EPerson n={n} open={n.user_id === openId} onToggle={onToggle} />
          </div>
        ))}
      </div>
      {next.length > 0 && (
        <div style={{ borderLeft: "1px solid var(--lo-tree-link)", marginLeft: 45, paddingLeft: 12, marginTop: 4 }}>
          <ELevel nodes={next} openId={openId} onToggle={onToggle} />
        </div>
      )}
    </>
  );
}

function Placement() {
  const q = useMember<{ members: Row[]; daily: Day[] }>("placement", "/placement");
  const tree = useMember<ENode | null>("enroll-tree", "/tree/enrollment/full");
  const [openId, setOpenId] = useState<number | null>(null);
  const rows = q.data?.members ?? [];
  const daily = q.data?.daily ?? [];
  const left = rows.filter((r) => r.leg === "L").length;
  return (
    <Page title="Placement Team">
      <h3 style={{ margin: "10px 0 4px" }}>Enrollment Downline (Horizontal Tree)</h3>
      <div style={{ overflowX: "auto", whiteSpace: "nowrap", padding: "8px 0" }} role="region" aria-label="Enrollment downline tree" tabIndex={0}>
        {tree.isLoading && <span>Loading…</span>}
        {tree.data && <ELevel nodes={[tree.data]} openId={openId} onToggle={setOpenId} />}
        {!tree.isLoading && !tree.data && <span className="error">No enrollment tree data yet.</span>}
      </div>
      <h3 style={{ margin: "14px 0 4px" }}>Placement Members</h3>
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
