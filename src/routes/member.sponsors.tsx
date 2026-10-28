import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Page, useMember } from "@/components/member-kit";

export const Route = createFileRoute("/member/sponsors")({
  head: () => ({ meta: [{ title: "Direct Sponsors List — Life OS Member" }, { name: "description", content: "Your direct Life OS referrals." }, { property: "og:title", content: "Direct Sponsors List — Life OS Member" }, { property: "og:description", content: "Your direct Life OS referrals." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Sponsors,
});

type Direct = { id: number; life_id: string; name?: string; phone: string; created_at: string; is_active: number | boolean };

function Sponsors() {
  const me = useMember<{ life_id: string }>("me", "/me").data;
  const q = useMember<{ directs: Direct[] }>("enroll", "/tree/enrollment");
  const rows = q.data?.directs ?? [];
  return (
    <Page title="Direct Sponsors List">
      <DataTable
        caption={<> Direct Downline by the account {me?.life_id} (my group {rows.length}) </>}
        head={["Joining Time", "User ID", "Full Name", "Cell Number", "Status"]}
        rows={rows.map((r) => [r.created_at.slice(0, 10), <a key="u">{r.life_id}</a>, r.name ?? "", r.phone, r.is_active ? "Active" : "Inactive"])}
      />
    </Page>
  );
}
