import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Msg, Page, useMember } from "@/components/member-kit";
import { bdt } from "@/lib/member-api";

export const Route = createFileRoute("/member/withdrawals-report")({
  head: () => ({ meta: [{ title: "Withdrawals Reports — Life OS Member" }, { name: "description", content: "Your Life OS withdrawal history." }, { property: "og:title", content: "Withdrawals Reports — Life OS Member" }, { property: "og:description", content: "Your Life OS withdrawal history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Report,
});

type W = { id: number; method: string; account_number: string; amount: number; charge: number; status: string; admin_note: string | null; created_at: string };

function Report() {
  const q = useMember<W[]>("withdrawals", "/withdrawals");
  return (
    <Page title="Withdrawal Reports">
      <Msg text={q.error ? (q.error as Error).message : null} />
      <DataTable head={["Date", "Method", "Account", "Status", "Amount", "Charge", "Payable"]}
        rows={(q.data ?? []).map((r) => [r.created_at.slice(0, 10), r.method, r.account_number, r.status, bdt(r.amount), bdt(r.charge), bdt(r.amount - r.charge)])} />
    </Page>
  );
}
