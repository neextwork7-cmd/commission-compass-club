import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Msg, Page, useMember } from "@/components/member-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/member/tree")({
  head: () => ({ meta: [{ title: "Genealogy Tree — Life OS Member" }, { name: "description", content: "Life OS binary genealogy tree." }, { property: "og:title", content: "Genealogy Tree — Life OS Member" }, { property: "og:description", content: "Life OS binary genealogy tree." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Tree,
});

type Node = {
  user_id: number; life_id: string; active: boolean; left_carry: number; right_carry: number;
  full_name?: string | null; sponsor_life_id?: string | null; purchased?: number; left_total?: number; right_total?: number; matched?: number;
  left: Node | null; right: Node | null;
};
type Slot = { n: Node | null; parent: Node | null; side: "L" | "R" | null };

function find(n: Node | null, id: string): Node | null {
  if (!n) return null;
  if (n.life_id.toLowerCase() === id.toLowerCase()) return n;
  return find(n.left, id) ?? find(n.right, id);
}

const ARROW = "/member-kit/neel/tree-arrow.png";

const money = (v?: number) => (Number(v) || 0).toFixed(2);
const num = (v?: number) => String(Math.round(Number(v) || 0));

/** One reference tree cell: photo (hover or tap shows the member info box) + "User ID" link, or a faded "Register" slot. */
function Person({ s, w, onPick, open, onToggle }: { s: Slot; w: number; onPick: (n: Node) => void; open: boolean; onToggle: (id: number | null) => void }) {
  if (s.n) {
    const n = s.n;
    return (
      <span className={`lo-node${open ? " open" : ""}`}>
        <Button variant="reference" size="reference" type="button" className="lo-tree-control" aria-label={`Details for ${n.life_id}`} aria-expanded={open} aria-describedby={`tree-info-${n.user_id}`} onClick={() => onToggle(open ? null : n.user_id)}>
          <img src="/member-kit/neel/blank.png" alt="" style={{ width: w, opacity: n.active ? 0.9 : 0.6 }} />
        </Button>
        <br />
        <a href="#" onClick={(e) => { e.preventDefault(); onToggle(null); onPick(n); }}>User ID: {n.life_id}</a>
        <span className="tooltip" id={`tree-info-${n.user_id}`} role="tooltip" onClick={() => onToggle(null)}>
          <b>Full Name: <span>{n.full_name ?? ""}</span></b><br />
          <b>Sponsored By: <span>{n.sponsor_life_id ?? ""}</span></b><br />
          <b>Purchased : <span>{money(n.purchased)}</span></b><br />
          <b>Left All-Total: <span>{num(n.left_total)}</span></b><br />
          <b>Right All-Total : <span>{num(n.right_total)}</span></b><br />
          <b>Total Matched: <span>{num(n.matched)}</span></b><br />
          <b>Left Carry: <span>{num(n.left_carry)}</span></b><br />
          <b>Right Carry: <span>{num(n.right_carry)}</span></b><br />
        </span>
      </span>
    );
  }
  if (!s.parent || !s.side) return <>{"\u00a0"}</>;
  const href = `/join?ref=${encodeURIComponent(s.parent.life_id)}&team=${s.side}`;
  return (
    <>
      <a href={href}><img src="/member-kit/neel/blank.png" alt="" style={{ width: w, opacity: 0.4 }} /></a>
      <br />
      <a href={href}>Register</a>
    </>
  );
}

const kids = (row: Slot[]): Slot[] => row.flatMap((s) => [
  { n: s.n?.left ?? null, parent: s.n, side: s.n ? "L" as const : null },
  { n: s.n?.right ?? null, parent: s.n, side: s.n ? "R" as const : null },
]);

function ArrowRow({ row, span, width }: { row: Slot[]; span: number; width: number }) {
  return <tr>{row.map((s, i) => <td key={i} colSpan={span} style={{ padding: 0 }}>{s.n ? <img className="link_img" src={ARROW} alt="" style={{ width }} /> : "\u00a0"}</td>)}</tr>;
}

function Tree() {
  const q = useMember<Node | null>("tree", "/tree/binary");
  const [root, setRoot] = useState<Node | null>(null);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
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
  const top = root ?? q.data ?? null;

  const l0: Slot[] = [{ n: top, parent: null, side: null }];
  const l1 = kids(l0), l2 = kids(l1), l3 = kids(l2);
  const cell = (s: Slot, w: number, key: number, extra: { colSpan?: number; width?: string }): ReactNode => (
    <td key={key} valign="top" {...extra}><Person s={s} w={w} onPick={setRoot} open={!!s.n && s.n.user_id === openId} onToggle={setOpenId} /></td>
  );

  return (
    <Page title="Placement View">
      <Msg text={q.error ? (q.error as Error).message : msg} />
      <table width="100%" cellSpacing={0} cellPadding={2} id="demo">
        <tbody>
          <tr><th colSpan={8} style={{ textAlign: "center", height: 60 }}> </th></tr>
          <tr>
            <td colSpan={8} align="left" style={{ textAlign: "left" }}>
              <form style={{ textAlign: "left" }} onSubmit={(e) => {
                e.preventDefault();
                const f = find(q.data ?? null, search.trim());
                setMsg(f ? null : "User not found in your tree");
                setOpenId(null);
                if (f) setRoot(f);
              }}>
                <input type="text" aria-label="Search User ID" size={12} value={search} onChange={(e) => setSearch(e.target.value)} />{" "}
                <input type="submit" value="View tree" />
              </form>
            </td>
          </tr>
          <tr>
            <th colSpan={8} style={{ textAlign: "center", height: 60 }}>
              <Button variant="reference" size="reference" type="button" className="lo-tree-control" aria-label="Back to my tree" title="Back to my tree" onClick={() => { setRoot(null); setSearch(""); setMsg(null); setOpenId(null); }}><img className="link_img" src="/member-kit/neel/tree-arrow-down.png" alt="" style={{ width: 100 }} /></Button>
            </th>
          </tr>
          {!top ? (
            <tr><td colSpan={8}>{q.isLoading ? "Loading…" : "No tree data yet."}</td></tr>
          ) : (
            <>
              <tr>
                <td colSpan={2}> </td>
                {l0[0] && cell(l0[0], 200, 0, { colSpan: 4 })}
                <td colSpan={2}> </td>
              </tr>
              <tr><td colSpan={8} style={{ padding: 0 }}><img className="link_img" src={ARROW} alt="" style={{ width: 500 }} /></td></tr>
              <tr>
                <td> </td>
                {l1[0] && cell(l1[0], 160, 0, { colSpan: 2, width: "50%" })}
                <td colSpan={2} valign="top"></td>
                {l1[1] && cell(l1[1], 160, 1, { colSpan: 2, width: "50%" })}
                <td> </td>
              </tr>
              <ArrowRow row={l1} span={4} width={250} />
              <tr>{l2.map((s, i) => cell(s, 110, i, { colSpan: 2, width: "25%" }))}</tr>
              <ArrowRow row={l2} span={2} width={125} />
              <tr>{l3.map((s, i) => cell(s, 80, i, { width: "12.5%" }))}</tr>
            </>
          )}
        </tbody>
      </table>
    </Page>
  );
}
