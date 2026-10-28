import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Msg, Page, useMember } from "@/components/member-kit";
import { bdt } from "@/lib/member-api";

export const Route = createFileRoute("/member/recharge-report")({
  head: () => ({ meta: [{ title: "Recharge Reports — Life OS Member" }, { name: "description", content: "Your Life OS mobile recharge history." }, { property: "og:title", content: "Recharge Reports — Life OS Member" }, { property: "og:description", content: "Your Life OS mobile recharge history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Report,
});

type Row = { id: number; recharge_code: string; operator: string; phone: string; amount: number; status: string; admin_note: string | null; created_at: string; processed_at: string | null };
const OPERATOR: Record<string, string> = { GP: "GrameenPhone", BL: "Banglalink", RB: "Robi", AT: "Airtel", TT: "Teletalk" };

function Report() {
  const q = useMember<Row[]>("recharges", "/recharges");
  return (
    <Page title="Mobile Recharge Reports">
      <Msg text={q.error ? (q.error as Error).message : null} />
      <DataTable head={["SN", "Date", "Time", "Operator", "Mobile No", "Amount", "Status", "Note"]}
        rows={(q.data ?? []).map((r, i) => [
          i + 1, r.created_at.slice(0, 10), r.created_at.slice(11, 16), OPERATOR[r.operator] ?? r.operator, r.phone, bdt(r.amount),
          <b key="s" className={r.status === "PAID" ? "success" : r.status === "PENDING" ? undefined : "error"}>{r.status}</b>,
          r.admin_note ?? "",
        ])} />
    </Page>
  );
}
