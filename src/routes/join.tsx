import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { memberApi, memberToken } from "@/lib/member-api";
import { NeelFrame, NEEL_LINKS } from "@/components/neel-frame";
import { BLOOD_GROUPS, DISTRICTS, type JoinTeam } from "@/lib/join-fields";

type Search = { ref?: string | undefined; team?: JoinTeam | undefined };
type Sponsor = { name: string; life_id: string; placement_life_id: string; placement_side: JoinTeam };

export const Route = createFileRoute("/join")({
  validateSearch: (s: Record<string, unknown>): Search => ({ ref: typeof s["ref"] === "string" ? s["ref"] : undefined, team: s["team"] === "L" || s["team"] === "R" ? s["team"] : undefined }),
  head: () => ({
    meta: [
      { title: "Join Life OS — Member Registration" },
      { name: "description", content: "Register a new Life OS member account through your sponsor's referral link." },
      { property: "og:title", content: "Join Life OS — Member Registration" },
      { property: "og:description", content: "Register a new Life OS member account through your sponsor's referral link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: NEEL_LINKS,
  }),
  component: Join,
});

function Join() {
  const { ref, team: linkTeam } = Route.useSearch();
  const navigate = useNavigate();
  const [team, setTeam] = useState<JoinTeam | undefined>(linkTeam);
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [refErr, setRefErr] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState("");
  useEffect(() => { setTeam(linkTeam); }, [linkTeam, ref]);
  useEffect(() => {
    let active = true;
    setSponsor(null); setRefErr("");
    if (!ref) { setRefErr("A sponsor referral link is required. Please request a Left or Right Team link from your sponsor."); return; }
    memberApi<Sponsor>(`/sponsor?code=${encodeURIComponent(ref)}${team ? `&team=${team}` : ""}`)
      .then(s => { if (active) setSponsor(s); })
      .catch(e => { if (active) setRefErr(e.message === "Failed to fetch" ? "Unable to verify this referral link. Please try again when the server is available." : e.message); });
    return () => { active = false; };
  }, [ref, team]);

  async function pickPhoto(file?: File) {
    setPhoto(null); setPhotoErr("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { setPhotoErr("Choose a JPG, PNG or WebP photo no larger than 2 MB."); return; }
    try {
      const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid photo"));
        reader.onerror = () => reject(new Error("Unable to read photo"));
        reader.readAsDataURL(file);
      });
      setPhoto(value);
    } catch { setPhotoErr("Unable to read photo. Please choose it again."); }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!sponsor || !team || photoErr) return;
    if (fd.get("password") !== fd.get("confirm")) { setErr("Passwords do not match."); return; }
    setErr(""); setBusy(true);
    try {
      const r = await memberApi<{ token: string; life_id: string }>("/register", { body: {
        name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email"),
        nid_number: fd.get("nid_number"), blood_group: fd.get("blood_group"), district: fd.get("district"),
        post_code: fd.get("post_code"), address_current: fd.get("address_current"), photo_base64: photo,
        username: fd.get("username"), password: fd.get("password"), confirm_password: fd.get("confirm"),
        referral_code: ref, team, accepted_terms: fd.get("terms") ? 1 : 0,
      } });
      memberToken.set(r.token);
      await navigate({ to: "/member" });
    } catch (x) { setErr(x instanceof Error ? (x.message === "Failed to fetch" ? "Unable to connect to the registration server. Please try again." : x.message) : "Registration failed."); }
    finally { setBusy(false); }
  }
  function row(label: string, id: string, control: ReactNode, required = false, first = false) {
    return <tr key={id}><td width={first ? "40%" : undefined}><label htmlFor={id}>{label}</label>{required && <> <sup>*</sup></>}</td><td width={first ? "2%" : undefined}>:</td><td>{control}</td></tr>;
  }
  return <NeelFrame><div className="main_bg about">
    <h2 id="heading">Register Form</h2>
    <form onSubmit={submit}>
      <table width="100%" border={0} cellSpacing={0} cellPadding={0}><tbody><tr>
        <td width="50%" valign="top">
          <table width="100%" border={0} cellSpacing={5} cellPadding={0}><tbody>
            {refErr && <tr><td colSpan={3} className="error" role="alert">{refErr}</td></tr>}
            {ref && !refErr && !sponsor && <tr><td colSpan={3} role="status">Verifying sponsor and placement…</td></tr>}
            {row("Full Name", "name", <input id="name" name="name" type="text" required maxLength={100} autoComplete="name" />, true, true)}
            {row("Cell Number", "phone", <input id="phone" name="phone" type="text" inputMode="tel" required pattern="01[3-9][0-9]{8}" title="01XXXXXXXXX" autoComplete="tel" />, true)}
            {row("Email Address", "email", <input id="email" name="email" type="email" required maxLength={120} autoComplete="email" />, true)}
            {row("NID/PP No/DL. No.", "nid_number", <input id="nid_number" name="nid_number" type="text" maxLength={30} />)}
            {row("Blood Group", "blood_group", <select id="blood_group" name="blood_group" required defaultValue=""><option value="">Select</option>{BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}</select>, true)}
            {row("District Name", "district", <select id="district" name="district" required defaultValue=""><option value="">Select</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select>, true)}
            {row("Post Code", "post_code", <input id="post_code" name="post_code" type="text" required maxLength={12} autoComplete="postal-code" />, true)}
            {row("Address", "address_current", <textarea id="address_current" name="address_current" required maxLength={2000} autoComplete="street-address" />, true)}
            {row("Profile Passport Size Photo", "photo", <><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void pickPhoto(e.currentTarget.files?.[0])} />{photo && <img className="lo-photo-preview" src={photo} alt="Selected profile photo" />}{photoErr && <div className="error" role="alert">{photoErr}</div>}</>)}
            {row("Sponsor/Referral ID", "sponsor", <input id="sponsor" type="text" value={sponsor?.life_id ?? ref ?? ""} readOnly />, true)}
            {row("Placement UserID", "placement", <input id="placement" type="text" value={sponsor?.placement_life_id ?? ""} readOnly />, true)}
            {row("Choose Option", "team-l", <><input id="team-l" type="radio" name="team" value="L" checked={team === "L"} disabled={!!linkTeam} required onChange={() => setTeam("L")} /> <label htmlFor="team-l" style={{ display: "inline" }}>Left Team</label> <input id="team-r" type="radio" name="team" value="R" style={{ marginLeft: 20 }} checked={team === "R"} disabled={!!linkTeam} required onChange={() => setTeam("R")} /> <label htmlFor="team-r" style={{ display: "inline" }}>Right Team</label></>, true)}
            {row("Enter Username", "username", <input id="username" name="username" type="text" required minLength={4} maxLength={40} pattern="[A-Za-z][A-Za-z0-9_]{3,39}" autoComplete="username" />, true)}
            {row("Enter Password", "password", <input id="password" name="password" type="password" required minLength={4} maxLength={72} autoComplete="new-password" />, true)}
            {row("Confirm Password", "confirm", <input id="confirm" name="confirm" type="password" required minLength={4} maxLength={72} autoComplete="new-password" />, true)}
            {row("Terms & Conditions", "terms", <><input id="terms" name="terms" type="checkbox" required /> I Agree With Company TOS</>)}
            <tr><td></td><td>:</td><td><input id="submit" type="submit" value={busy ? "Submitting…" : "Submit"} disabled={busy || !sponsor || !team || !!photoErr} />{err && <div className="error" role="alert" style={{ marginTop: 5 }}>{err}</div>}</td></tr>
          </tbody></table>
        </td>
        <td valign="top">
          <br /><br /><br />
          {sponsor && <table className="table" width="100%" cellSpacing={5} cellPadding={0}>
            <thead><tr><th>Sponsor</th><th>Sponsor ID</th><th>Placement ID</th><th>Team</th></tr></thead>
            <tbody><tr><td>{sponsor.name}</td><td>{sponsor.life_id}</td><td>{sponsor.placement_life_id}</td><td>{(team ?? sponsor.placement_side) === "L" ? "Left Team" : "Right Team"}</td></tr></tbody>
          </table>}
        </td>
      </tr></tbody></table>
    </form>
  </div></NeelFrame>;
}
