import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, Page, useMember } from "@/components/member-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/member/sponsors")({
  head: () => ({ meta: [{ title: "Direct Sponsors List — Life OS Member" }, { name: "description", content: "Your direct Life OS referrals." }, { property: "og:title", content: "Direct Sponsors List — Life OS Member" }, { property: "og:description", content: "Your direct Life OS referrals." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Sponsors,
});

type Direct = { id: number; life_id: string; name?: string; phone: string; created_at: string; is_active: number | boolean };
type ENode = {
  user_id: number; life_id: string; full_name?: string | null; created_at: string;
  active: boolean; purchased: number; directs: number; team_total: number; children: ENode[];
};

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

/** Renders one level of the enrollment tree horizontally, then the next level below it. */
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

function Sponsors() {
  const me = useMember<{ life_id: string }>("me", "/me").data;
  const q = useMember<{ directs: Direct[] }>("enroll", "/tree/enrollment");
  const tree = useMember<ENode | null>("enroll-tree", "/tree/enrollment/full");
  const [openId, setOpenId] = useState<number | null>(null);
  const rows = q.data?.directs ?? [];
  return (
    <Page title="Direct Sponsors List">
      <div style={{ overflowX: "auto", whiteSpace: "nowrap", padding: "8px 0" }} role="region" aria-label="Enrollment downline tree" tabIndex={0}>
        {tree.isLoading && <span>Loading…</span>}
        {tree.data && <ELevel nodes={[tree.data]} openId={openId} onToggle={setOpenId} />}
        {!tree.isLoading && !tree.data && <span className="error">No enrollment tree data yet.</span>}
      </div>
      <DataTable
        caption={<> Direct Downline by the account {me?.life_id} (my group {rows.length}) </>}
        head={["Joining Time", "User ID", "Full Name", "Cell Number", "Status"]}
        rows={rows.map((r) => [r.created_at.slice(0, 10), <a key="u">{r.life_id}</a>, r.name ?? "", r.phone, r.is_active ? "Active" : "Inactive"])}
      />
    </Page>
  );
}
