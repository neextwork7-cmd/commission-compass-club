import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Msg, Page, useMember } from "@/components/member-kit";
import { bdt, memberApi } from "@/lib/member-api";

export const Route = createFileRoute("/member/transaction")({
  head: () => ({ meta: [{ title: "Active New ID — Life OS Member" }, { name: "description", content: "Activate a member ID package from your Deposit wallet." }, { property: "og:title", content: "Active New ID — Life OS Member" }, { property: "og:description", content: "Activate a member ID package from your Deposit wallet." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ActiveNewId,
});

/** Package price is fixed by the plan; the server charges the same amount. */
const PACKAGE_FEE = 1000;

function ActiveNewId() {
  const w = useMember<{ deposit_balance: number }>("wallet", "/wallet");
  const settings = useMember<Record<string, string>>("settings", "/settings");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ receiver: "", password: "", transaction_password: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await memberApi<{ activation_code: string; life_id: string }>("/activate-id", { body: f });
      setMsg({ ok: true, t: `ID ${r.life_id} activated (${r.activation_code}). Commission settles at the next daily settlement.` });
      setF({ ...f, receiver: "" });
      w.refetch();
    } catch (err) { setMsg({ ok: false, t: (err as Error).message }); }
    finally { setBusy(false); }
  };
  const disabled = settings.data?.["transfer_status"] === "0";
  const low = Number(w.data?.deposit_balance ?? 0) < PACKAGE_FEE;
  return (
    <Page title="Active New ID">
      <form onSubmit={submit} autoComplete="off" style={{ maxWidth: 560 }}>
        <Msg ok={msg?.ok} text={msg?.t ?? (w.error ? (w.error as Error).message : disabled ? "Active New ID is currently disabled." : null)} />
        <table width="100%" border={0} cellSpacing={5} cellPadding={0}>
          <tbody>
            <tr><td width="40%">Deposit Wallet Balance</td><td width="2%">:</td><td>{bdt(w.data?.deposit_balance)}</td></tr>
            <tr><td>User ID to Activate <sup>*</sup></td><td>:</td><td><input type="text" required maxLength={40} value={f.receiver} onChange={(e) => setF({ ...f, receiver: e.target.value })} /></td></tr>
            <tr><td>Package Amount</td><td>:</td><td><input type="text" readOnly value={PACKAGE_FEE.toFixed(2)} aria-label="Package amount" /></td></tr>
            <tr><td>Your Login Password <sup>*</sup></td><td>:</td><td><input type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} style={{ width: 90 }} /></td></tr>
            <tr><td>Your Transaction Password <sup>*</sup></td><td>:</td><td><input type="password" required value={f.transaction_password} onChange={(e) => setF({ ...f, transaction_password: e.target.value })} style={{ width: 90 }} /> <Link to="/member/transaction-pin" style={{ color: "#0577B5" }}>Set PIN</Link></td></tr>
            <tr><td></td><td>:</td><td><input type="submit" value={busy ? "Activating…" : "Confirm & Activate"} disabled={busy || !w.data || disabled || low} /></td></tr>
            {low && w.data && <tr><td colSpan={3} className="error">Deposit wallet needs at least {bdt(PACKAGE_FEE)}. Only the Deposit wallet can be used.</td></tr>}
          </tbody>
        </table>
      </form>
    </Page>
  );
}
