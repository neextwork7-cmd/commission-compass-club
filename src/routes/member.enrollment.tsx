import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, Page, useMember } from "@/components/member-kit";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/member/enrollment")({
  head: () => ({ meta: [{ title: "Enrollment Team & Income — Life OS Member" }, { name: "description", content: "All members under your enrollment with Binary and Enrollment matching income." }, { property: "og:title", content: "Enrollment Team & Income — Life OS Member" }, { property: "og:description", content: "All members under your enrollment with Binary and Enrollment matching income." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Enrollment,
});

type Row = { id: number; life_id: string; full_name?: string; created_at: string; is_active: number | string; level: number; leg: "L" | "R"; binary_bill: string; enrollment_bill: string; paid: string };
type Day = { day: string; binary_total: string; enrollment_total: string; paid: string; events: number };
type ENode = {
  user_id: number; life_id: string; full_name?: string | null; created_at: string;
  active: boolean; purchased: number; bv?: number; directs: number; team_total: number; children: ENode[];
  legs?: { life_id: string; total: number; carry: number; paired: number }[]; pairs?: number; events?: number; earned?: number;
};
const tk = (v: string | number) => `৳${Number(v).toFixed(3)}`;
const money = (v?: number) => (Number(v) || 0).toFixed(2);

/** One genealogy-style cell: photo button (tap opens the info box) + User ID link. */
function Person({ n, w, open, onToggle }: { n: ENode; w: number; open: boolean; onToggle: (id: number | null) => void }) {
  return (
    <Popover open={open} onOpenChange={(next) => onToggle(next ? n.user_id : null)}>
    <PopoverAnchor asChild><span className="lo-node">
      <PopoverTrigger asChild><Button variant="reference" size="reference" type="button" className="lo-tree-control" aria-label={`Details for ${n.life_id}`}>
        <img src="/member-kit/neel/blank.png" alt="" style={{ width: w, opacity: n.active ? 0.9 : 0.6 }} />
      </Button></PopoverTrigger>
      <br />
      <a href="#" onClick={(e) => { e.preventDefault(); onToggle(open ? null : n.user_id); }}>User ID: {n.life_id}</a>
    </span></PopoverAnchor>
    <ProfileInfo n={n} />
    </Popover>
  );
}

function ProfileInfo({ n }: { n: ENode }) {
  return (
      <PopoverContent aria-label={`Profile for ${n.life_id}`} side="bottom" collisionPadding={12} className="max-h-[min(440px,70vh)] w-80 max-w-[calc(100vw-24px)] overflow-y-auto text-xs leading-5">
        <b>User ID: <span>{n.life_id}</span></b><br />
        <b>Full Name: <span>{n.full_name ?? ""}</span></b><br />
        <b>Joined: <span>{n.created_at.slice(0, 10)}</span></b><br />
        <b>Purchased: <span>{money(n.purchased)}</span></b><br />
        <b>Current BV: <span>{Math.round(Number(n.bv) || 0)}</span></b><br />
        <b>Direct Team: <span>{n.directs}</span></b><br />
        <b>Total Downline: <span>{n.team_total}</span></b><br />
        <b>Status: <span>{n.active ? "Active" : "Inactive"}</span></b><br />
        {(n.legs ?? []).map((l, i) => (
          <span key={i}><b>Big Leg {i + 1}: <span>{l.life_id} — {Math.round(l.total)} pt (Paired {Math.round(l.paired)}, Carry {Math.round(l.carry)})</span></b><br /></span>
        ))}
        <b>Total Paired: <span>{n.pairs ?? 0}</span></b><br />
        <b>Matching Events: <span>{n.events ?? 0}</span></b><br />
        <b>Matching Earned: <span>{money(n.earned)}</span></b><br />
      </PopoverContent>
  );
}

/** Org-chart connector styles: parent → down arrow → horizontal line across all children → down arrow into each child. */
const TREE_CSS = `
.eo-tree{display:inline-flex;flex-direction:column;align-items:center;min-width:100%}
.eo-node{display:flex;flex-direction:column;align-items:center}
.eo-down{display:flex;flex-direction:column;align-items:center;color:var(--lo-tree-link,currentColor)}
.eo-down i{display:block;width:2px;height:18px;background:currentColor}
.eo-down b{display:block;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid currentColor}
.eo-kids{display:flex;align-items:flex-start;justify-content:flex-start;width:max-content;min-width:100%;margin:0 auto}
.eo-kid{position:relative;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;padding:0 10px;color:var(--lo-tree-link,currentColor)}
.eo-kid::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:currentColor}
.eo-kid:first-child::before{left:50%}
.eo-kid:last-child::before{right:50%}
.eo-kid:only-child::before{display:none}
.eo-kid>.eo-node{color:initial}
`;

function Down() { return <span className="eo-down" aria-hidden="true"><i /><b /></span>; }

type PUser = { id: number; life_id: string; name: string | null; amount?: number; bv?: number } | null;
type Pair = { id: number; created_at: string; a: PUser; b: PUser; event_number: number; selected_type: string; enrollment_bill: string; binary_bill: string; actual_payout: string; payout_status: string };

function PUserView({ u, node }: { u: PUser; node: ENode | undefined }) {
  return (
    <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
      <Popover>
        <PopoverTrigger asChild><Button variant="reference" size="reference" type="button" className="lo-tree-control" aria-label={`Pair profile for ${u?.life_id ?? "unknown member"}`} disabled={!u}>
          <img src="/member-kit/neel/blank.png" alt="" style={{ width: 64, borderRadius: "50%" }} />
        </Button></PopoverTrigger>
        {node ? <ProfileInfo n={node} /> : <PopoverContent aria-label={`Profile for ${u?.life_id}`} className="text-xs"><b>{u?.name ?? u?.life_id}</b><p>Current profile information unavailable.</p></PopoverContent>}
      </Popover>
      <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u?.name || "—"}</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{u?.life_id ?? "?"}</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{u ? `৳${money(u.amount)}` : ""}</div>
      <div style={{ fontSize: 11, opacity: 0.75 }}>{u ? `${Number(u.bv ?? 0)} BV` : ""}</div>
    </div>
  );
}

function PairCards({ data, loading, nodes }: { data: { day: string | null; pairs: Pair[] } | undefined; loading: boolean; nodes: Map<number, ENode> }) {
  return (
    <div style={{ margin: "12px 0" }}>
      <h4 style={{ margin: "0 0 8px" }}>Enrollment Pairs — Last Day {data?.day ? `(${data.day})` : ""}</h4>
      {loading && <span>Loading…</span>}
      {!loading && !data?.pairs?.length && <span className="error">No enrollment pairs yet.</span>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
        {data?.pairs?.map((p) => (
          <div key={p.id} style={{ border: "1px solid #ccc", borderRadius: 10, padding: 10, background: "rgba(255,255,255,0.9)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PUserView u={p.a} node={p.a ? nodes.get(p.a.id) : undefined} />
              <div style={{ fontWeight: 800, fontSize: 18 }} aria-label="paired with">⇄</div>
              <PUserView u={p.b} node={p.b ? nodes.get(p.b.id) : undefined} />
            </div>
            <div style={{ borderTop: "1px dashed #bbb", marginTop: 8, paddingTop: 6, fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <span>Event #{p.event_number}</span><span style={{ textAlign: "right" }}>{p.created_at?.slice(11, 16)}</span>
              <span>Pair Amount: {tk((Number(p.a?.amount) || 0) + (Number(p.b?.amount) || 0))}</span><span style={{ textAlign: "right" }}>{(Number(p.a?.bv) || 0) + (Number(p.b?.bv) || 0)} BV</span>
              <span>Enrollment: {tk(p.enrollment_bill)}</span><span style={{ textAlign: "right" }}>Binary: {tk(p.binary_bill)}</span>
              <b>Paid ({p.selected_type}): {tk(p.actual_payout)}</b><span style={{ textAlign: "right" }}>{p.payout_status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Enrollment() {
  const q = useMember<{ members: Row[]; daily: Day[] }>("placement", "/placement");
  const tree = useMember<ENode | null>("enroll-tree", "/tree/enrollment/full");
  const pairs = useMember<{ day: string | null; pairs: Pair[] }>("enroll-pairs", "/enrollment/pairs");
  const [openId, setOpenId] = useState<number | null>(null);
  const nodes = new Map<number, ENode>();
  const collect = (n: ENode) => { nodes.set(n.user_id, n); n.children.forEach(collect); };
  if (tree.data) collect(tree.data);
  const rows = q.data?.members ?? [];
  const daily = q.data?.daily ?? [];
  const left = rows.filter((r) => r.leg === "L").length;
  return (
    <Page title="Enrollment Team">
      <style>{TREE_CSS}</style>
      <div style={{ padding: "8px 0", textAlign: "center" }} role="region" aria-label="Enrollment genealogy tree" tabIndex={0}>
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
                <div style={{ overflowX: "auto", overflowY: "hidden", padding: "0 0 8px" }} role="region" aria-label="Enrollment downline users" tabIndex={0}>
                  <div className="eo-kids">
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
      <PairCards data={pairs.data} loading={pairs.isLoading} nodes={nodes} />
      <DataTable
        caption={<> Daily Matching — each matching pays only the higher of Binary / Enrollment bill (Left {left}, Right {rows.length - left}) </>}
        head={["Date", "Binary Bill", "Enrollment Bill", "Paid (one bill per matching)", "Events"]}
        rows={daily.map((d) => [d.day, tk(d.binary_total), tk(d.enrollment_total), tk(d.paid), d.events])}
      />
    </Page>
  );
}
