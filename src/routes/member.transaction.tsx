import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Msg, Page, useMember } from "@/components/member-kit";
import { bdt, memberApi } from "@/lib/member-api";

export const Route = createFileRoute("/member/transaction")({
  head: () => ({ meta: [{ title: "Balance Transfer — Life OS Member" }, { name: "description", content: "Move Life OS service credit to another member." }, { property: "og:title", content: "Balance Transfer — Life OS Member" }, { property: "og:description", content: "Move Life OS service credit to another member." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Transfer,
});

function Transfer() {
  const w = useMember<{ service_balance: number; withdrawable: number; recharge_pending: number }>("wallet", "/wallet");
  const settings = useMember<Record<string, string>>("settings", "/settings");
  const min = Number(settings.data?.["transfer_min"] ?? 10);
  const max = Number(settings.data?.["transfer_max"] ?? 0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ receiver: "", amount: "", note: "", password: "", transaction_password: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!Number.isFinite(amount) || amount < min || (max > 0 && amount > max)) return setMsg({ ok: false, t: max > 0 ? `Enter an amount between ${bdt(min)} and ${bdt(max)}.` : `Minimum transfer is ${bdt(min)}.` });
    setBusy(true);
    try {
      const r = await memberApi<{ transfer_code: string }>("/transfers", { body: { ...f, amount: Number(f.amount) } });
      setMsg({ ok: true, t: `Transfer ${r.transfer_code} completed successfully.` });
      setF({ ...f, amount: "", note: "" });
      w.refetch();
    } catch (err) { setMsg({ ok: false, t: (err as Error).message }); }
    finally { setBusy(false); }
  };
  const disabled = settings.data?.["transfer_status"] === "0";
  return (
    <Page title="Balance Transfer">
      <table width="100%" border={0} cellSpacing={0} cellPadding={0}>
        <tbody>
          <tr>
            <td width="50%" valign="top">
              <form onSubmit={submit} autoComplete="off">
                <Msg ok={msg?.ok} text={msg?.t ?? (w.error ? (w.error as Error).message : settings.error ? (settings.error as Error).message : disabled ? "Balance transfer is currently disabled." : null)} />
                <table width="100%" border={0} cellSpacing={5} cellPadding={0}>
                  <tbody>
                    <tr><td>Transferable Balance</td><td width="2%">:</td><td>{bdt(w.data?.service_balance)}</td></tr>
                    <tr><td className="message" colSpan={3}></td></tr>
                    <tr><td width="36%">Receiver User ID <sup>*</sup></td><td width="2%">:</td><td><input type="text" required maxLength={40} value={f.receiver} onChange={(e) => setF({ ...f, receiver: e.target.value })} /></td></tr>
                    <tr><td>Enter Amount <sup>*</sup></td><td>:</td><td><input type="text" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,3})?" title={`Minimum ${min}${max > 0 ? `, maximum ${max}` : ""}`} required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></td></tr>
                    <tr><td>Transfer Note</td><td>:</td><td><input type="text" maxLength={255} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></td></tr>
                    <tr><td>Your Login Password <sup>*</sup></td><td>:</td><td><input type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} style={{ width: 70 }} /></td></tr>
                    <tr><td>Your Transaction Password <sup>*</sup></td><td>:</td><td><input type="password" autoComplete="off" required value={f.transaction_password} onChange={(e) => setF({ ...f, transaction_password: e.target.value })} style={{ width: 70 }} /> <Link to="/member/transaction-pin" style={{ color: "#0577B5" }}>Set PIN</Link></td></tr>
                    <tr><td></td><td>:</td><td><input type="submit" value={busy ? "Submitting…" : "Transfer"} disabled={busy || !settings.data || !w.data || disabled} /></td></tr>
                  </tbody>
                </table>
              </form>
            </td>
            <td valign="top"> </td>
          </tr>
        </tbody>
      </table>
    </Page>
  );
}
