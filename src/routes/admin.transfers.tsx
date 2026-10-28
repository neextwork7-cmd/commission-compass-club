import { createFileRoute } from "@tanstack/react-router";
import { DataTable, fmtDate, Page, useAdmin } from "@/components/admin-kit";

export const Route = createFileRoute("/admin/transfers")({
  head: () => ({ meta: [{ title: "Balance Transfers — Life OS Admin" }, { name: "description", content: "Audit trail of member balance transfers." }, { property: "og:title", content: "Balance Transfers — Life OS Admin" }, { property: "og:description", content: "Audit trail of member balance transfers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Transfers,
});

type Row = { id: number; transfer_code: string; amount: number; note: string | null; created_at: string; from_life_id: string; to_life_id: string };

function Transfers() {
  const q = useAdmin<Row[]>("transfers", "/transfers");
  return (
    <Page title="Balance Transfers" center>
      <DataTable head={["Sl", "Date & Time", "Transfer Code", "From", "To", "Amount", "Note"]}
        rows={(q.data ?? []).map((r, i) => [i + 1, fmtDate(r.created_at), r.transfer_code, r.from_life_id, r.to_life_id, r.amount, r.note ?? "—"])} />
      {q.error ? <p style={{ color: "#C00", fontWeight: 600 }}>{(q.error as Error).message}</p> : null}
    </Page>
  );
}
