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

/** Org-chart connector styles: parent → down arrow → horizontal line across all children → down arrow into each child. */
const TREE_CSS = `
.eo-tree{display:inline-flex;flex-direction:column;align-items:center;min-width:100%}
.eo-node{display:flex;flex-direction:column;align-items:center}
.eo-down{display:flex;flex-direction:column;align-items:center;color:var(--lo-tree-link,currentColor)}
.eo-down i{display:block;width:2px;height:18px;background:currentColor}
.eo-down b{display:block;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid currentColor}
.eo-kids{display:flex;align-items:flex-start;justify-content:center}
.eo-kid{position:relative;display:flex;flex-direction:column;align-items:center;padding:0 10px;color:var(--lo-tree-link,currentColor)}
.eo-kid::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:currentColor}
.eo-kid:first-child::before{left:50%}
.eo-kid:last-child::before{right:50%}
.eo-kid:only-child::before{display:none}
.eo-kid>.eo-node{color:initial}
`;

function Down() { return <span className="eo-down" aria-hidden="true"><i /><b /></span>; }

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
      <style>{TREE_CSS}</style>
      <div style={{ overflowX: "auto", whiteSpace: "nowrap", padding: "8px 0", textAlign: "center" }} role="region" aria-label="Enrollment genealogy tree" tabIndex={0}>
        {tree.isLoading && <span>Loading…</span>}
        {tree.data && (() => {
          // You centered on screen; every downline user in one scrollable row below.
          const all: ENode[] = [];
          const walk = (n: ENode) => n.children.forEach((c) => { all.push(c); walk(c); });
          walk(tree.data);
          return (
            <>
              <div className="eo-tree" style={{ minWidth: 0 }}>
                <Person n={tree.data} w={110} open={openId === tree.data.user_id} onToggle={setOpenId} />
                {all.length > 0 && <Down />}
              </div>
              {all.length > 0 && (
                <div style={{ overflowX: "auto", padding: "0 0 8px" }} role="region" aria-label="Enrollment downline users" tabIndex={0}>
                  <div className="eo-kids" style={{ minWidth: "100%", justifyContent: "center" }}>
                    {all.map((c) => (
                      <div className="eo-kid" key={c.user_id}>
                        <Down />
                        <Person n={c} w={110} open={openId === c.user_id} onToggle={setOpenId} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
        {!tree.isLoading && !tree.data && <span className="error">No enrollment tree data yet.</span>}
      </div>
      <DataTable
        caption={<> Daily Matching — each matching pays only the higher of Binary / Enrollment bill (Left {left}, Right {rows.length - left}) </>}
        head={["Date", "Binary Bill", "Enrollment Bill", "Paid (one bill per matching)", "Events"]}
        rows={daily.map((d) => [d.day, tk(d.binary_total), tk(d.enrollment_total), tk(d.paid), d.events])}
      />
    </Page>
  );
}
