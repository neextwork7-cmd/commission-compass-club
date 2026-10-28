import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Msg, Page, useMember } from "@/components/member-kit";
import { bdt, memberApi } from "@/lib/member-api";

export const Route = createFileRoute("/member/recharge")({
  head: () => ({ meta: [{ title: "Mobile Recharge — Life OS Member" }, { name: "description", content: "Recharge a Bangladeshi mobile number from your Life OS balance." }, { property: "og:title", content: "Mobile Recharge — Life OS Member" }, { property: "og:description", content: "Recharge a Bangladeshi mobile number from your Life OS balance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Recharge,
});

type Settings = { recharge_status?: string; recharge_min?: string; recharge_max?: string; operators?: Record<string, string> };
const FIELD: React.CSSProperties = { width: 120, padding: "5px 10px" };

function Recharge() {
  const w = useMember<{ withdrawable: number; recharge_pending: number }>("wallet", "/wallet");
  const settings = useMember<Settings>("settings", "/settings");
  const min = Number(settings.data?.["recharge_min"] ?? 10);
  const max = Number(settings.data?.["recharge_max"] ?? 0);
  const operators = settings.data?.operators ?? {};
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ operator: "GP", phone: "", amount: "", password: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!Number.isFinite(amount) || amount < min || (max > 0 && amount > max)) return setMsg({ ok: false, t: max > 0 ? `Enter an amount between ${bdt(min)} and ${bdt(max)}.` : `Minimum recharge is ${bdt(min)}.` });
    setBusy(true);
    try {
      await memberApi("/recharges", { body: { ...f, amount } });
      setMsg({ ok: true, t: "Recharge request submitted successfully." });
      setF({ ...f, amount: "" });
      w.refetch();
    } catch (err) { setMsg({ ok: false, t: (err as Error).message }); }
    finally { setBusy(false); }
  };
  const disabled = settings.data?.["recharge_status"] === "0";
  return (
    <Page title="Mobile Recharge From">
      <form onSubmit={submit}>
        <Msg ok={msg?.ok} text={msg?.t ?? (w.error ? (w.error as Error).message : settings.error ? (settings.error as Error).message : disabled ? "Mobile recharge is currently disabled." : null)} />
        <table width="50%" border={0} cellSpacing={10} cellPadding={0}>
          <tbody>
            <tr><td width="50%">Your Current Amount</td><td>:</td><td>{bdt(w.data?.withdrawable)}</td></tr>
            <tr><td>Select Operator <sup>*</sup></td><td>:</td><td>
              <select value={f.operator} onChange={(e) => setF({ ...f, operator: e.target.value })} style={{ width: 142, padding: "5px 10px" }}>
                {Object.entries(operators).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select></td></tr>
            <tr><td>Enter Mobile No <sup>*</sup></td><td>:</td><td><input type="text" inputMode="numeric" pattern="01[3-9][0-9]{8}" title="01XXXXXXXXX" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} style={FIELD} /></td></tr>
            <tr><td>Recharge Amount <sup>*</sup></td><td>:</td><td><input type="text" inputMode="decimal" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} style={FIELD} /></td></tr>
            <tr><td>Your Login Password <sup>*</sup></td><td>:</td><td><input type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} style={FIELD} /></td></tr>
            <tr><td></td><td></td><td><input type="submit" value={busy ? "Submitting…" : "Submit"} disabled={busy || !settings.data || !w.data || disabled || Object.keys(operators).length === 0} /></td></tr>
          </tbody>
        </table>
      </form>
    </Page>
  );
}
