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

const ARROW = "/member-kit/neel/tree-arrow.png";

/** One enrollment level as a genealogy-style table row: every person in its own cell, arrow row below connecting to the next level. */
function Level({ nodes, w, openId, onToggle }: { nodes: ENode[]; w: number; openId: number | null; onToggle: (id: number | null) => void }) {
  if (nodes.length === 0) return null;
  const next = nodes.flatMap((n) => n.children);
  return (
    <>
      <tr>
        {nodes.map((n) => (
          <td key={n.user_id} valign="top" align="center" style={{ minWidth: w + 24, padding: "4px 8px" }}>
            <Person n={n} w={w} open={n.user_id === openId} onToggle={onToggle} />
          </td>
        ))}
      </tr>
      {next.length > 0 && (
        <>
          <tr>
            {nodes.map((n) => (
              <td key={n.user_id} align="center" style={{ padding: 0 }}>
                {n.children.length > 0 ? <img className="link_img" src={ARROW} alt="" style={{ width: Math.min(240, n.children.length * (w - 20)) }} /> : " "}
              </td>
            ))}
          </tr>
          <Level nodes={next} w={Math.max(64, w - 20)} openId={openId} onToggle={onToggle} />
        </>
      )}
    </>
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
        {tree.data && (
          <table width="100%" cellSpacing={0} cellPadding={2} style={{ minWidth: 640 }}>
            <tbody>
              <tr><th style={{ textAlign: "center", height: 40 }}> </th></tr>
              <tr>
                <th style={{ textAlign: "center", height: 60 }}>
                  <Button variant="reference" size="reference" type="button" className="lo-tree-control" aria-label="My enrollment tree" title="My enrollment tree" onClick={() => setOpenId(null)}><img className="link_img" src={ARROW_DOWN} alt="" style={{ width: 100 }} /></Button>
                </th>
              </tr>
              <Level nodes={[tree.data]} w={160} openId={openId} onToggle={setOpenId} />
            </tbody>
          </table>
        )}
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
