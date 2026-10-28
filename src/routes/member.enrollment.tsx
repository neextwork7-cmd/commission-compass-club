import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DataTable, Page, useMember } from "@/components/member-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/member/enrollment")({
  head: () => ({ meta: [{ title: "Enrollment Team & Income — Life OS Member" }, { name: "description", content: "All members under your enrollment with Binary and Enrollment matching income." }, { property: "og:title", content: "Enrollment Team & Income — Life OS Member" }, { property: "og:description", content: "All members under your enrollment with Binary and Enrollment matching income." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Enrollment,
});

type Row = { id: number; life_id: string; full_name?: string; created_at: string; is_active: number | string; level: number; leg: "L" | "R"; binary_bill: string; enrollment_bill: string; paid: string };
type Day = { day: string; binary_total: string; enrollment_total: string; paid: string; events: number };
type ENode = {
  user_id: number; life_id: string; full_name?: string | null; created_at: string;
  active: boolean; purchased: number; directs: number; team_total: number; children: ENode[];
};
const tk = (v: string | number) => `৳${Number(v).toFixed(3)}`;
const money = (v?: number) => (Number(v) || 0).toFixed(2);

/** One genealogy-style cell: photo button (tap opens the info box) + User ID link. */
function Person({ n, w, open, onToggle }: { n: ENode; w: number; open: boolean; onToggle: (id: number | null) => void }) {
  return (
    <span className={`lo-node${open ? " open" : ""}`}>
      <Button variant="reference" size="reference" type="button" className="lo-tree-control" aria-label={`Details for ${n.life_id}`} aria-expanded={open} aria-describedby={`enroll-info-${n.user_id}`} onClick={() => onToggle(open ? null : n.user_id)}>
        <img src="/member-kit/neel/blank.png" alt="" style={{ width: w, opacity: n.active ? 0.9 : 0.6 }} />
      </Button>
      <br />
      <a href="#" onClick={(e) => { e.preventDefault(); onToggle(open ? null : n.user_id); }}>User ID: {n.life_id}</a>
      <span className="tooltip" id={`enroll-info-${n.user_id}`} role="tooltip" onClick={() => onToggle(null)}>
        <b>Full Name: <span>{n.full_name ?? ""}</span></b><br />
        <b>Joined: <span>{n.created_at.slice(0, 10)}</span></b><br />
        <b>Purchased: <span>{money(n.purchased)}</span></b><br />
        <b>Direct Team: <span>{n.directs}</span></b><br />
        <b>Total Downline: <span>{n.team_total}</span></b><br />
        <b>Status: <span>{n.active ? "Active" : "Inactive"}</span></b><br />
      </span>
    </span>
  );
}

/** One enrollment level: all persons of this depth in a horizontal row, each connected down to its own children. */
function Level({ nodes, w, openId, onToggle }: { nodes: ENode[]; w: number; openId: number | null; onToggle: (id: number | null) => void }) {
  if (nodes.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginTop: 10 }}>
      {nodes.map((n) => (
        <div key={n.user_id} style={{ textAlign: "center", minWidth: w + 20 }}>
          <Person n={n} w={w} open={n.user_id === openId} onToggle={onToggle} />
          {n.children.length > 0 && (
            <>
              <div style={{ lineHeight: 1, color: "var(--lo-tree-link)", fontSize: 18 }}>↓</div>
              <div style={{ borderLeft: "1px solid var(--lo-tree-link)", marginLeft: w / 2 + 10, paddingLeft: 10 }}>
                <Level nodes={n.children} w={Math.max(56, w - 24)} openId={openId} onToggle={onToggle} />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Enrollment() {
  const q = useMember<{ members: Row[]; daily: Day[] }>("placement", "/placement");
  const tree = useMember<ENode | null>("enroll-tree", "/tree/enrollment/full");
  const [openId, setOpenId] = useState<number | null>(null);
  // Tapping anywhere outside a member closes the open info box (touch screens have no hover-out).
  useEffect(() => {
    if (openId === null) return;
    const close = (e: PointerEvent) => { if (!(e.target as Element | null)?.closest?.(".lo-node")) setOpenId(null); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [openId]);
  const rows = q.data?.members ?? [];
  const daily = q.data?.daily ?? [];
  const left = rows.filter((r) => r.leg === "L").length;
  return (
    <Page title="Enrollment Team">
      <h3 style={{ margin: "10px 0 4px" }}>Enrollment Genealogy — আপনার স্পনসর করা সব ডাউনলাইন</h3>
      <div style={{ overflowX: "auto", whiteSpace: "nowrap", padding: "8px 0" }} role="region" aria-label="Enrollment genealogy tree" tabIndex={0}>
        {tree.isLoading && <span>Loading…</span>}
        {tree.data && <Level nodes={[tree.data]} w={120} openId={openId} onToggle={setOpenId} />}
        {!tree.isLoading && !tree.data && <span className="error">No enrollment tree data yet.</span>}
      </div>
      <h3 style={{ margin: "14px 0 4px" }}>Enrollment Members</h3>
      <div style={{ overflowX: "auto", whiteSpace: "nowrap", padding: "8px 0" }} role="region" aria-label="Enrollment members" tabIndex={0}>
        {rows.length === 0 && <span className="error">No enrollment member found.</span>}
        {rows.map((r) => (
          <div key={r.id} style={{ display: "inline-block", verticalAlign: "top", width: 150, margin: "0 4px", border: "1px solid var(--lo-tree-link)", padding: 6, textAlign: "center", whiteSpace: "normal" }}>
            <b>{r.life_id}</b><br />{r.full_name ?? ""}<br />
            Level {r.level} · {r.leg === "L" ? "Left" : "Right"}<br />
            {Number(r.is_active) ? "Active" : "Inactive"}<br />
            Binary {tk(r.binary_bill)}<br />Enrollment {tk(r.enrollment_bill)}<br /><b>Paid {tk(r.paid)}</b>
          </div>
        ))}
      </div>
      <DataTable
        caption={<> Daily Matching — each matching pays only the higher of Binary / Enrollment bill (Left {left}, Right {rows.length - left}) </>}
        head={["Date", "Binary Bill", "Enrollment Bill", "Paid (one bill per matching)", "Events"]}
        rows={daily.map((d) => [d.day, tk(d.binary_total), tk(d.enrollment_total), tk(d.paid), d.events])}
      />
    </Page>
  );
}
