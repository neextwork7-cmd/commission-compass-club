import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page, DataTable, Msg, fmtDateShort } from "@/components/admin-kit";
import { FilterBar, useAdmin } from "@/components/admin-kit";
import { adminApi } from "@/lib/admin-api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/member-list")({
  head: () => ({ meta: [{ title: "Member List — Life OS Admin" }, { name: "description", content: "All members with status, password and one-click login controls." }, { property: "og:title", content: "Member List — Life OS Admin" }, { property: "og:description", content: "All members with status, password and one-click login controls." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MemberList,
});

type Member = {
  id: number; life_id: string; name: string; phone: string; email: string | null;
  status: string; is_active: number; sponsor_life_id: string; created_at: string;
};

const btn = { padding: "3px 8px", cursor: "pointer", fontWeight: 700, border: "1px solid #007a35", borderRadius: 3 } as const;

function MemberList() {
  const [applied, setApplied] = useState({ from: "", to: "", q: "" });
  const qs = `${applied.from ? `from=${applied.from}&` : ""}${applied.to ? `to=${applied.to}&` : ""}${applied.q ? `q=${encodeURIComponent(applied.q)}` : ""}`;
  const q = useAdmin<Member[]>("member-list", "/member-list" + (qs ? `?${qs}` : ""));
  const [msg, setMsg] = useState<{ ok?: boolean; text: string | null }>({ text: null });
  const [pwFor, setPwFor] = useState<Member | null>(null);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const rows = q.data ?? [];

  const setStatus = async (id: number, status: string) => {
    setMsg({ text: null });
    try {
      await adminApi(`/members/${id}/status`, { body: { status: status.toLowerCase() } });
      setMsg({ ok: true, text: "Status updated." });
      await q.refetch();
    } catch (x) { setMsg({ text: (x as Error).message }); }
  };

  // Opens the member panel in a new tab; this admin tab stays signed in.
  const loginAs = async (m: Member) => {
    setMsg({ text: null });
    const tab = window.open("", "_blank");
    try {
      const r = await adminApi<{ token: string }>(`/members/${m.id}/login-as`, { method: "POST", body: {} });
      const url = `${import.meta.env.BASE_URL}member-access#t=${encodeURIComponent(r.token)}`;
      if (tab) tab.location.href = url;
      else window.open(url, "_blank");
    } catch (x) {
      tab?.close();
      setMsg({ text: (x as Error).message });
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwFor) return;
    if (pw.length < 6 || pw.length > 72) { setPwErr("Password must be 6–72 characters."); return; }
    setPwBusy(true); setPwErr(null);
    try {
      await adminApi(`/members/${pwFor.id}/password`, { body: { password: pw } });
      setMsg({ ok: true, text: `New password saved for ${pwFor.life_id}.` });
      setPwFor(null); setPw("");
    } catch (x) { setPwErr((x as Error).message); } finally { setPwBusy(false); }
  };

  return (
    <Page title="Member List" center>
      <FilterBar value={applied} onChange={setApplied} />
      <Msg {...msg} />
      {q.error ? <p style={{ color: "#C00", fontWeight: 600 }}>{(q.error as Error).message}</p> : (
        <DataTable
          head={["Sl", "Date", "Life ID", "Name", "Phone", "Email", "Sponsor", "Tree Active", "Status", "Change Status", "Password", "Login"]}
          rows={rows.map((m, i) => {
            const status = String(m.status ?? "").toUpperCase();
            return [
              i + 1, fmtDateShort(m.created_at), m.life_id, m.name, m.phone, m.email ?? "—", m.sponsor_life_id,
              m.is_active ? "Yes" : "No",
              <b key="s" style={{ color: status === "ACTIVE" ? "#009541" : "#C00" }}>{status}</b>,
              <select key="c" defaultValue="" onChange={(e) => { const v = e.target.value; if (v) { e.target.value = ""; setStatus(m.id, v); } }}>
                <option value="" disabled>Change…</option>
                {["ACTIVE", "SUSPENDED", "PENDING"].filter((s) => s !== status).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>,
              <button key="p" type="button" style={btn} onClick={() => { setPwFor(m); setPw(""); setPwErr(null); }} aria-label={`Set new password for ${m.life_id}`}>Set Password</button>,
              <button key="l" type="button" style={{ ...btn, background: "#009541", color: "#fff" }} onClick={() => loginAs(m)} aria-label={`Login as ${m.life_id}`}>Login</button>,
            ];
          })}
        />
      )}

      <Dialog open={!!pwFor} onOpenChange={(o) => { if (!o) setPwFor(null); }}>
        <DialogContent>
          <form onSubmit={savePassword}>
            <DialogHeader>
              <DialogTitle>Set new password</DialogTitle>
              <DialogDescription>{pwFor ? `${pwFor.life_id} — ${pwFor.name ?? ""}` : ""}. The member will log in with this password from now on.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label htmlFor="new-member-password">New login password</Label>
              <Input id="new-member-password" type="text" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} maxLength={72} required />
              {pwErr && <p className="text-sm text-destructive">{pwErr}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwFor(null)}>Cancel</Button>
              <Button type="submit" disabled={pwBusy}>{pwBusy ? "Saving…" : "Save Password"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
