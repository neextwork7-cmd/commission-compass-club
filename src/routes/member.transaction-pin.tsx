import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Msg, Page, useMember } from "@/components/member-kit";
import { memberApi } from "@/lib/member-api";

export const Route = createFileRoute("/member/transaction-pin")({
  head: () => ({ meta: [{ title: "Transaction Password — Life OS Member" }, { name: "description", content: "Set the Life OS transaction password used to approve balance transfers." }, { property: "og:title", content: "Transaction Password — Life OS Member" }, { property: "og:description", content: "Set the Life OS transaction password used to approve balance transfers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TransactionPin,
});

function TransactionPin() {
  const me = useMember<{ transaction_pin_set: boolean }>("me", "/me");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ current_password: "", transaction_password: "", confirm: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.transaction_password !== f.confirm) return setMsg({ ok: false, t: "Transaction password and confirm password do not match." });
    setBusy(true);
    try {
      await memberApi("/transaction-pin", { body: { current_password: f.current_password, transaction_password: f.transaction_password } });
      setMsg({ ok: true, t: "Transaction password changed successfully." });
      setF({ ...f, transaction_password: "", confirm: "" });
      me.refetch();
    } catch (err) { setMsg({ ok: false, t: (err as Error).message }); }
    finally { setBusy(false); }
  };
  return (
    <Page title="Reset Transaction PIN">
      <Msg ok={msg?.ok} text={msg?.t ?? (me.data && !me.data.transaction_pin_set ? "You have not set a transaction password yet. Balance transfers need one." : null)} />
      <form onSubmit={submit}>
        <table width="100%" border={0} cellSpacing={5} cellPadding={0}>
          <tbody>
            <tr><td width="30%">Your Login Password <sup>*</sup></td><td width="2%">:</td><td><input type="password" autoComplete="current-password" required value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} style={{ width: 150 }} /></td></tr>
            <tr><td>New Transaction Password <sup>*</sup></td><td>:</td><td><input type="password" autoComplete="off" minLength={4} required value={f.transaction_password} onChange={(e) => setF({ ...f, transaction_password: e.target.value })} style={{ width: 150 }} /></td></tr>
            <tr><td>Confirm Transaction Password <sup>*</sup></td><td>:</td><td><input type="password" autoComplete="off" minLength={4} required value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} style={{ width: 150 }} /></td></tr>
            <tr><td /><td>:</td><td><input type="submit" value={busy ? "Saving…" : "Submit"} disabled={busy || !me.data} /></td></tr>
          </tbody>
        </table>
      </form>
    </Page>
  );
}
