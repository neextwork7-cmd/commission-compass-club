import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Page, useMember } from "@/components/member-kit";

export const Route = createFileRoute("/member/statistics")({
  head: () => ({ meta: [{ title: "Statistics View — Life OS Member" }, { name: "description", content: "Life OS team statistics." }, { property: "og:title", content: "Statistics View — Life OS Member" }, { property: "og:description", content: "Life OS team statistics." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Stats,
});

type Node = { active: boolean; left_carry: number; right_carry: number; left: Node | null; right: Node | null };
const count = (n: Node | null): { all: number; active: number } => {
  if (!n) return { all: 0, active: 0 };
  const a = count(n.left), b = count(n.right);
  return { all: 1 + a.all + b.all, active: (n.active ? 1 : 0) + a.active + b.active };
};

function Stats() {
  const t = useMember<Node | null>("tree", "/tree/binary").data ?? null;
  const rank = useMember<{ lifetime_matchings: number; current: { name?: string } | null }>("rank", "/rank").data;
  const L = count(t?.left ?? null), R = count(t?.right ?? null);
  return (
    <Page title="Statistics View">
      <DataTable
        style={{ marginTop: 10 }}
        caption={<u>Current Rank: {rank?.current?.name ?? "Free Member"}</u>}
        head={["On The Position", "Left Team", "Right Team"]}
        rows={[
          ["Total Members", L.all, R.all],
          ["Active Members", L.active, R.active],
          ["Inactive Members", L.all - L.active, R.all - R.active],
          ["Carry Forward", t?.left_carry ?? 0, t?.right_carry ?? 0],
          ["Lifetime Matchings", rank?.lifetime_matchings ?? 0, ""],
        ]}
      />
      <p style={{ marginTop: 10 }}>Rank list is pending final confirmation; no rank reward is paid until it is approved.</p>
    </Page>
  );
}
