import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Msg, Page, useMember } from "@/components/member-kit";
import { memberApi } from "@/lib/member-api";

export const Route = createFileRoute("/member/profile")({
  head: () => ({ meta: [{ title: "My Profile — Life OS Member" }, { name: "description", content: "View and edit your Life OS profile." }, { property: "og:title", content: "My Profile — Life OS Member" }, { property: "og:description", content: "View and edit your Life OS profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Profile,
});

const TOP: [string, string][] = [
  ["name", "Full Name"], ["father_name", "Father's Name"], ["mother_name", "Mother's Name"],
  ["nominee_name", "Nominee's Name"], ["nominee_relation", "Relation With Nominee"], ["dob", "Date of Birth"],
  ["blood_group", "Blood Group"], ["nid_number", "Acc. NID No"],
];
const BOTTOM: [string, string][] = [
  ["post_code", "Post Code"], ["ward_no", "Ward No"], ["union_name", "Union / Municipality"],
  ["upazila", "Sub-District Name"], ["district", "District Name"],
];

function Profile() {
  const q = useMember<Record<string, string | null>>("profile", "/profile");
  const me = useMember<{ email: string | null; phone: string }>("me", "/me").data;
  const settings = useMember<Record<string, string>>("settings", "/settings");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => {
    if (q.data) setF(Object.fromEntries(Object.entries(q.data).map(([k, v]) => [k, v ?? ""])));
  }, [q.data]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setMsg({ ok: false, t: "Choose a JPG, PNG or WebP photo." });
    if (file.size > 1024 * 1024) return setMsg({ ok: false, t: "Photo must be under 1 MB." });
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(file);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fields = { ...f }; delete fields["photo_base64"];
      await memberApi("/profile", { body: photo ? { ...fields, photo_base64: photo } : fields });
      setMsg({ ok: true, t: "Profile updated successfully." });
      await q.refetch();
      setPhoto(null);
    } catch (err) {
      setMsg({ ok: false, t: (err as Error).message });
    } finally { setBusy(false); }
  };

  const field = ([k, l]: [string, string], i?: number) => (
    <tr key={k}>
      <td width={i === 0 ? "30%" : undefined}>{l}</td><td width={i === 0 ? "2%" : undefined}>:</td>
      <td><input type="text" placeholder={k === "dob" ? "YYYY-MM-DD" : undefined} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></td>
    </tr>
  );
  const img = photo || f["photo_base64"];
  const locked = busy || !q.data || !settings.data || settings.data["profile_edit_status"] === "0";

  return (
    <Page title="My Profile">
      <form onSubmit={save}>
        <Msg ok={msg?.ok} text={msg?.t ?? null} />
        <Msg text={q.error ? (q.error as Error).message : settings.error ? (settings.error as Error).message : settings.data?.["profile_edit_status"] === "0" ? "Profile editing is currently disabled." : null} />
        <table width="100%" border={0} cellSpacing={0} cellPadding={0}>
          <tbody>
            <tr>
              <td width="60%" valign="top">
                <table width="100%" border={0} cellSpacing={5} cellPadding={0}>
                  <tbody>
                    {TOP.map(field)}
                    <tr><td>Email Address</td><td>:</td><td><input type="text" readOnly value={me?.email ?? ""} /></td></tr>
                    <tr><td>Mobile Number</td><td>:</td><td><input type="text" readOnly value={me?.phone ?? ""} /></td></tr>
                    {field(["phone_alt", "Alternate Number"])}
                    <tr><td>Address</td><td>:</td><td><textarea value={f["address_current"] ?? ""} onChange={(e) => setF({ ...f, address_current: e.target.value })} /></td></tr>
                    {BOTTOM.map((x) => field(x))}
                  </tbody>
                </table>
              </td>
              <td valign="top">
                <table width="100%" border={0} cellSpacing={5} cellPadding={0}>
                  <tbody>
                    <tr><td width="30%">Passport Photo</td><td width="2%">:</td><td>{img ? <img src={img} alt="Passport" style={{ width: 120, height: 140, objectFit: "cover", border: "1px solid #083E88" }} /> : "No photo available"}</td></tr>
                    <tr><td>New Photo</td><td>:</td><td><input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} /></td></tr>
                    <tr><td /><td /><td><br /><br /><br /><br /><br /><br /><br /><input type="submit" value={busy ? "Saving…" : "Save"} disabled={locked} /></td></tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    </Page>
  );
}
