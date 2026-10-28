import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Msg, Page } from "@/components/member-kit";
import { memberApi } from "@/lib/member-api";

export const Route = createFileRoute("/member/change-password")({
  head: () => ({ meta: [{ title: "Change Password — Life OS Member" }, { name: "description", content: "Change your Life OS password." }, { property: "og:title", content: "Change Password — Life OS Member" }, { property: "og:description", content: "Change your Life OS password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChangePassword,
});

function ChangePassword() {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nw !== cf) return setMsg({ ok: false, t: "New password and confirm password do not match." });
    try {
      await memberApi("/password", { body: { current_password: cur, new_password: nw } });
      setMsg({ ok: true, t: "Password changed successfully." });
      setCur(""); setNw(""); setCf("");
    } catch (err) {
      setMsg({ ok: false, t: (err as Error).message });
    }
  };
  return (
    <Page title="Change Password">
      <Msg ok={msg?.ok} text={msg?.t ?? null} />
      <form onSubmit={submit}>
        <table width="100%" border={0} cellSpacing={5} cellPadding={0}>
          <tbody>
            <tr><td width="30%">Old Password *</td><td width="2%">:</td><td><input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required /></td></tr>
            <tr><td>New Password *</td><td>:</td><td><input type="password" autoComplete="new-password" value={nw} onChange={(e) => setNw(e.target.value)} required minLength={6} maxLength={72} /></td></tr>
            <tr><td>Confirm New Password *</td><td>:</td><td><input type="password" autoComplete="new-password" value={cf} onChange={(e) => setCf(e.target.value)} required maxLength={72} /></td></tr>
            <tr><td colSpan={2}> </td><td colSpan={2}><input type="submit" value="Save" /></td></tr>
          </tbody>
        </table>
      </form>
    </Page>
  );
}
