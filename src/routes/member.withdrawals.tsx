import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Msg, Page, useMember } from "@/components/member-kit";
import { bdt, memberApi } from "@/lib/member-api";

export const Route = createFileRoute("/member/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals Form — Life OS Member" }, { name: "description", content: "Request a Life OS withdrawal." }, { property: "og:title", content: "Withdrawals Form — Life OS Member" }, { property: "og:description", content: "Request a Life OS withdrawal." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Withdraw,
});

const W100: React.CSSProperties = { width: 100 };

function Withdraw() {
  const w = useMember<{ withdrawable: number; pending_withdrawal: number }>("wallet", "/wallet");
  const settings = useMember<Record<string, string>>("settings", "/settings");
  const min = Number(settings.data?.["withdraw_min"] ?? 500);
  const max = Number(settings.data?.["withdraw_max"] ?? 25000);
  const chargePct = Number(settings.data?.["withdraw_charge_pct"] ?? 0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ method: "bKash", account_number: "", amount: "", member_note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!Number.isFinite(amount) || amount < min || (max > 0 && amount > max)) return setMsg({ ok: false, t: `Enter an amount between ${bdt(min)} and ${bdt(max)}.` });
    if (amount * (1 + chargePct / 100) > Number(w.data?.withdrawable ?? 0)) return setMsg({ ok: false, t: "Amount including charge is more than your withdrawable balance." });
    setBusy(true);
    try {
      await memberApi("/withdrawals", { body: { ...f, amount } });
      setMsg({ ok: true, t: "Withdrawal request submitted successfully." });
      setF({ ...f, amount: "" });
      w.refetch();
    } catch (err) { setMsg({ ok: false, t: (err as Error).message }); }
    finally { setBusy(false); }
  };
  const disabled = settings.data?.["withdrawal_status"] === "0";
  return (
    <Page title="Withdrawal From">
      <form onSubmit={submit}>
        <Msg ok={msg?.ok} text={msg?.t ?? (w.error ? (w.error as Error).message : settings.error ? (settings.error as Error).message : disabled ? "Withdrawal requests are currently disabled." : null)} />
        <table width="50%" border={0} cellSpacing={10} cellPadding={0}>
          <tbody>
            <tr><td width="50%">Your Withdraw Amount</td><td>:</td><td>{bdt(w.data?.withdrawable)}</td></tr>
            <tr><td>Enter Withdraw Amount <sup>*</sup></td><td>:</td><td><input type="text" inputMode="decimal" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} style={{ ...W100, textAlign: "right" }} /></td></tr>
            <tr><td>Select A Payment Method <sup>*</sup></td><td>:</td><td>
              <select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} style={{ width: 150 }}>
                {["bKash", "Nagad", "Rocket", "Bank"].map((m) => <option key={m}>{m}</option>)}
              </select></td></tr>
            <tr><td>Account Number <sup>*</sup></td><td>:</td><td><input type="text" required value={f.account_number} onChange={(e) => setF({ ...f, account_number: e.target.value })} style={W100} /></td></tr>
            <tr><td>Withdraw Note <br />(how we send to you)</td><td>:</td><td><textarea maxLength={1000} value={f.member_note} onChange={(e) => setF({ ...f, member_note: e.target.value })} /></td></tr>
            <tr><td>Charge ({chargePct}%)</td><td>:</td><td style={{ color: "red" }}>{bdt(Number(f.amount || 0) * (chargePct / 100))}</td></tr>
            <tr><td></td><td>:</td><td><input type="submit" value={busy ? "Submitting…" : "Withdraw Request Now"} disabled={busy || !settings.data || !w.data || disabled} /></td></tr>
          </tbody>
        </table>
      </form>
    </Page>
  );
}
